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
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Riesgo 15-nov: un cajero de equipo recibía rol=EMPRENDEDOR y los permisos del rol global, sin forma de que el SPA
 * supiera que solo opera el POS. Ahora la respuesta lleva rolEquipo/permisosEquipo (aditivos); el rol Spring del JWT
 * y los permisos/authorities del token NO cambian (los interceptores del cajero y el POS dependen de ello).
 */
@DisplayName("Login/cambiar-negocio: rolEquipo y permisosEquipo aditivos, JWT intacto")
class CajeroRolEquipoRespuestaTest {

    private static final List<String> PERMISOS_GLOBALES =
        List.of("pos.usar", "pos.caja.abrir", "orders.view", "products.create", "finances.view");

    private JwtUtil jwtUtil;
    private RefreshTokenService refreshTokenService;
    private MiembroEmpresaRepository miembros;
    private EmpresaRepository empresas;
    private AuthSupport authSupport;
    private Empresa negocio;

    @BeforeEach
    void preparar() {
        jwtUtil = mock(JwtUtil.class);
        refreshTokenService = mock(RefreshTokenService.class);
        miembros = mock(MiembroEmpresaRepository.class);
        empresas = mock(EmpresaRepository.class);
        PermisoRepository permisos = mock(PermisoRepository.class);
        when(permisos.findPermisosByUsuarioId(anyLong())).thenReturn(PERMISOS_GLOBALES);
        when(jwtUtil.generateTokenFull(anyString(), anyLong(), anyString(), any(), any(), anyList())).thenReturn("jwt");
        when(jwtUtil.generateToken(anyString(), anyLong(), anyString(), any(), any())).thenReturn("jwt");
        RefreshToken rt = new RefreshToken();
        rt.setRawToken("raw");
        when(refreshTokenService.crear(any(Usuario.class))).thenReturn(rt);
        when(refreshTokenService.crear(any(Usuario.class), any())).thenReturn(rt);
        authSupport = new AuthSupport();
        ReflectionTestUtils.setField(authSupport, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(authSupport, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(authSupport, "permisoRepository", permisos);
        ReflectionTestUtils.setField(authSupport, "miembroEmpresaRepository", miembros);
        ReflectionTestUtils.setField(authSupport, "empresaRepository", empresas);
        negocio = new Empresa();
        negocio.setId(41L);
        negocio.setSlug("negocio-ficticio");
        negocio.setNombreEmpresa("Negocio Ficticio");
        when(empresas.findById(41L)).thenReturn(Optional.of(negocio));
    }

    private static Usuario usuario(Empresa principal) {
        Usuario u = new Usuario();
        u.setId(7L);
        u.setCorreo("miembro.ficticio@ejemplo.test");
        u.setNombre("Miembro");
        u.setEstado(1);
        Rol r = new Rol();
        r.setNombreRol("EMPRENDEDOR");
        u.setRoles(List.of(r));
        u.setEmpresa(principal);
        return u;
    }

    private MiembroEmpresa miembro(String rolEquipo) {
        MiembroEmpresa m = new MiembroEmpresa();
        m.setEmpresa(negocio);
        m.setEstado(1);
        m.setRolEnEmpresa(rolEquipo);
        when(miembros.findByUsuarioIdAndEstado(7L, 1)).thenReturn(List.of(m));
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(7L, 41L, 1)).thenReturn(Optional.of(m));
        return m;
    }

    @Test
    @DisplayName("login de CAJERO (membresía única): rolEquipo=CAJERO, permisosEquipo solo POS, rol y permisos intactos")
    void loginCajero() {
        miembro("CAJERO");
        AuthResponse r = authSupport.buildAuthResponse(usuario(null));
        assertThat(r.getRolEquipo()).isEqualTo("CAJERO");
        assertThat(r.getPermisosEquipo()).containsExactly("pos.usar", "pos.caja.abrir");
        // Contrato existente sin cambios: rol Spring y permisos/authorities del token
        assertThat(r.getRol()).isEqualTo("EMPRENDEDOR");
        assertThat(r.getPermisos()).isEqualTo(PERMISOS_GLOBALES);
        verify(jwtUtil).generateTokenFull(anyString(), eq(7L), eq("EMPRENDEDOR"), eq(41L), eq("negocio-ficticio"), eq(PERMISOS_GLOBALES));
    }

    @Test
    @DisplayName("login con negocio principal en usuario.empresa_id también resuelve la membresía CAJERO")
    void loginCajeroConPrincipal() {
        miembro("CAJERO");
        AuthResponse r = authSupport.buildAuthResponse(usuario(negocio));
        assertThat(r.getRolEquipo()).isEqualTo("CAJERO");
        assertThat(r.getRol()).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("login de PROPIETARIO: rolEquipo=PROPIETARIO y permisosEquipo = permisos (no pierde opciones)")
    void loginPropietario() {
        miembro("PROPIETARIO");
        AuthResponse r = authSupport.buildAuthResponse(usuario(null));
        assertThat(r.getRolEquipo()).isEqualTo("PROPIETARIO");
        assertThat(r.getPermisosEquipo()).isEqualTo(PERMISOS_GLOBALES);
        assertThat(r.getRol()).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("sin membresía (dueño antiguo): rolEquipo nulo")
    void sinMembresia() {
        AuthResponse r = authSupport.buildAuthResponse(usuario(negocio));
        assertThat(r.getRolEquipo()).isNull();
        assertThat(r.getPermisosEquipo()).isNull();
    }

    @Test
    @DisplayName("cambiar-negocio a un negocio donde es CAJERO: rolEquipo=CAJERO y JWT EMPRENDEDOR")
    void cambiarNegocioCajero() throws Exception {
        MiembroEmpresa m = miembro("CAJERO");
        UsuarioService us = mock(UsuarioService.class);
        AuthSupport as = spy(authSupport);
        Usuario u = usuario(null);
        doReturn(u).when(as).usuarioFromRequest(any());
        AuthTenantSwitchHandler h = new AuthTenantSwitchHandler();
        ReflectionTestUtils.setField(h, "usuarioService", us);
        ReflectionTestUtils.setField(h, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(h, "refreshTokenService", refreshTokenService);
        ReflectionTestUtils.setField(h, "miembroEmpresaRepository", miembros);
        ReflectionTestUtils.setField(h, "empresaRepository", empresas);
        ReflectionTestUtils.setField(h, "authSupport", as);

        ResponseEntity<?> res = h.cambiarNegocio(Map.of("empresaId", 41L), mock(HttpServletRequest.class), mock(HttpServletResponse.class));
        AuthResponse r = (AuthResponse) ((com.hotclick.dto.ResponseDTO) res.getBody()).getData();
        assertThat(r.getRolEquipo()).isEqualTo("CAJERO");
        assertThat(r.getPermisosEquipo()).containsExactly("pos.usar", "pos.caja.abrir");
        assertThat(r.getRol()).isEqualTo("EMPRENDEDOR");
        verify(jwtUtil).generateToken(anyString(), eq(7L), eq("EMPRENDEDOR"), eq(41L), eq("negocio-ficticio"));
        assertThat(m.getRolEnEmpresa()).isEqualTo("CAJERO");
    }
}
