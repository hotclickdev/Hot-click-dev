package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * QA5 área 2 fila 27: dueño con un solo negocio (solo membresía, sin usuario.empresa_id) debe entrar con ese negocio
 * activo en el token por todos los caminos que emiten tokens (buildAuthResponse = contraseña/2FA/Clerk; refresh;
 * WebAuthn usa el mismo resolver {@link AuthSupport#empresaActiva}).
 */
@DisplayName("Login: única membresía activa queda como empresa activa")
class LoginEmpresaActivaUnicaMembresiaTest {

    private JwtUtil jwtUtil;
    private RefreshTokenService refreshTokenService;
    private MiembroEmpresaRepository miembros;
    private EmpresaRepository empresas;
    private AuthSupport authSupport;
    private Empresa cafe;

    @BeforeEach
    void preparar() {
        jwtUtil = mock(JwtUtil.class);
        refreshTokenService = mock(RefreshTokenService.class);
        miembros = mock(MiembroEmpresaRepository.class);
        empresas = mock(EmpresaRepository.class);
        PermisoRepository permisos = mock(PermisoRepository.class);
        when(permisos.findPermisosByUsuarioId(anyLong())).thenReturn(List.of());
        when(jwtUtil.generateTokenFull(anyString(), anyLong(), anyString(), any(), any(), anyList())).thenReturn("jwt");
        RefreshToken rt = new RefreshToken();
        rt.setRawToken("raw");
        when(refreshTokenService.crear(any(Usuario.class))).thenReturn(rt);
        authSupport = new AuthSupport();
        ReflectionTestUtils.setField(authSupport, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(authSupport, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(authSupport, "permisoRepository", permisos);
        ReflectionTestUtils.setField(authSupport, "miembroEmpresaRepository", miembros);
        ReflectionTestUtils.setField(authSupport, "empresaRepository", empresas);
        cafe = empresa(41L, "negocio-ficticio");
        when(empresas.findById(41L)).thenReturn(Optional.of(cafe));
    }

    private static Empresa empresa(Long id, String slug) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setSlug(slug);
        e.setNombreEmpresa("Negocio Ficticio");
        return e;
    }

    private static Usuario dueno(String rol) {
        Usuario u = new Usuario();
        u.setId(7L);
        u.setCorreo("dueno.ficticio@ejemplo.test");
        u.setNombre("Dueño");
        u.setEstado(1);
        Rol r = new Rol();
        r.setNombreRol(rol);
        u.setRoles(List.of(r));
        return u;
    }

    private static MiembroEmpresa membresia(Empresa e) {
        MiembroEmpresa m = new MiembroEmpresa();
        m.setEmpresa(e);
        m.setEstado(1);
        return m;
    }

    @Test
    @DisplayName("una sola membresía activa → empresaId, slug y rol EMPRENDEDOR en token y respuesta")
    void unicaMembresiaQuedaActiva() {
        when(miembros.findByUsuarioIdAndEstado(7L, 1)).thenReturn(List.of(membresia(cafe)));
        AuthResponse r = authSupport.buildAuthResponse(dueno("USUARIO_FINAL"));
        assertThat(r.getEmpresaId()).isEqualTo(41L);
        assertThat(r.getEmpresaSlug()).isEqualTo("negocio-ficticio");
        assertThat(r.getRol()).isEqualTo("EMPRENDEDOR");
        verify(jwtUtil).generateTokenFull(anyString(), eq(7L), eq("EMPRENDEDOR"), eq(41L), eq("negocio-ficticio"), anyList());
    }

    @Test
    @DisplayName("varias membresías → no se elige ninguna (selector)")
    void variasMembresiasSinEmpresa() {
        when(miembros.findByUsuarioIdAndEstado(7L, 1))
            .thenReturn(List.of(membresia(cafe), membresia(empresa(42L, "otro-ficticio"))));
        AuthResponse r = authSupport.buildAuthResponse(dueno("EMPRENDEDOR"));
        assertThat(r.getEmpresaId()).isNull();
        verify(jwtUtil).generateTokenFull(anyString(), eq(7L), eq("EMPRENDEDOR"), isNull(), isNull(), anyList());
    }

    @Test
    @DisplayName("negocio principal del usuario manda; no consulta membresías")
    void principalSeRespeta() {
        Usuario u = dueno("EMPRENDEDOR");
        Empresa principal = empresa(5L, "principal-ficticio");
        u.setEmpresa(principal);
        AuthResponse r = authSupport.buildAuthResponse(u);
        assertThat(r.getEmpresaId()).isEqualTo(5L);
        verifyNoInteractions(miembros);
    }

    @Test
    @DisplayName("ADMIN sigue sin tenant aunque tenga una membresía")
    void adminSinTenant() {
        AuthResponse r = authSupport.buildAuthResponse(dueno("ADMIN"));
        assertThat(r.getEmpresaId()).isNull();
        verifyNoInteractions(miembros);
    }

    @Test
    @DisplayName("refresh sin negocio elegido → misma única membresía en el nuevo access token")
    void refreshUsaUnicaMembresia() {
        Usuario u = dueno("EMPRENDEDOR");
        when(miembros.findByUsuarioIdAndEstado(7L, 1)).thenReturn(List.of(membresia(cafe)));
        RefreshToken rotado = new RefreshToken();
        rotado.setUsuario(u);
        rotado.setRawToken("nuevo");
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(refreshTokenService.readCookie(req)).thenReturn("viejo");
        when(refreshTokenService.rotar("viejo", req)).thenReturn(rotado);

        AuthRefreshHandler h = new AuthRefreshHandler();
        ReflectionTestUtils.setField(h, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(h, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(h, "authSupport", authSupport);
        ReflectionTestUtils.setField(h, "miembroEmpresaRepository", miembros);
        ReflectionTestUtils.setField(h, "empresaRepository", empresas);
        ReflectionTestUtils.setField(h, "usuarioService", mock(com.hotclick.service.UsuarioService.class));
        ReflectionTestUtils.setField(h, "securityAuditService", mock(com.hotclick.service.SecurityAuditService.class));
        ReflectionTestUtils.setField(h, "tokenRevocadoService", mock(com.hotclick.service.TokenRevocadoService.class));

        h.refresh(Map.of(), req, mock(HttpServletResponse.class));
        verify(jwtUtil).generateTokenFull(anyString(), eq(7L), eq("EMPRENDEDOR"), eq(41L), eq("negocio-ficticio"), anyList());
    }
}
