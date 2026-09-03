package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.model.Empresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;

import java.sql.SQLException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthSupport — permisos")
class AuthSupportPermisosTest {

    @Mock UsuarioService usuarioService;
    @Mock JwtUtil jwtUtil;
    @Mock RefreshTokenService refreshTokenService;
    @Mock PermisoRepository permisoRepository;

    @InjectMocks AuthSupport authSupport;

    @Test
    @DisplayName("ADMIN de plataforma emite JWT sin empresaId")
    void adminSinEmpresaEnAuthResponse() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setCorreo("admin@hotclick.com");
        usuario.setNombre("Admin");
        Rol rol = new Rol();
        rol.setNombreRol("ADMIN");
        usuario.setRoles(List.of(rol));
        Empresa emp = new Empresa();
        emp.setId(1L);
        emp.setNombreEmpresa("HOTCLICK");
        emp.setSlug("hotclick");
        usuario.setEmpresa(emp);

        when(permisoRepository.findPermisosByUsuarioId(1L)).thenReturn(List.of());
        when(jwtUtil.generateTokenFull(anyString(), anyLong(), anyString(), isNull(), isNull(), anyList()))
            .thenReturn("access-token");
        RefreshToken refresh = new RefreshToken();
        refresh.setToken("refresh-token");
        when(refreshTokenService.crear(any(Usuario.class))).thenReturn(refresh);

        AuthResponse resp = authSupport.buildAuthResponse(usuario);

        assertThat(resp.getRol()).isEqualTo("ADMIN");
        assertThat(resp.getEmpresaId()).isNull();
        assertThat(resp.getEmpresaSlug()).isNull();
        assertThat(resp.getEmpresaNombre()).isNull();
    }

    @Test
    @DisplayName("Si falta la tabla de permisos, el login igual emite tokens")
    void loginSinTablaDePermisosEmiteTokens() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setCorreo("admin@hotclick.com");
        usuario.setNombre("Admin");

        when(permisoRepository.findPermisosByUsuarioId(1L))
            .thenThrow(new DataAccessResourceFailureException("tabla ausente", new SQLException("not found")));
        when(jwtUtil.generateTokenFull(anyString(), anyLong(), anyString(), isNull(), isNull(), anyList()))
            .thenReturn("access-token");
        RefreshToken refresh = new RefreshToken();
        refresh.setToken("refresh-token");
        when(refreshTokenService.crear(any(Usuario.class))).thenReturn(refresh);

        AuthResponse resp = authSupport.buildAuthResponse(usuario);

        assertThat(resp.getAccessToken()).isEqualTo("access-token");
        assertThat(resp.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(resp.getPermisos()).isEmpty();
        assertThat(resp.getRol()).isEqualTo("USUARIO_FINAL");
    }

    @Test
    @DisplayName("permisosDe devuelve lista vacía si la consulta nativa falla")
    void permisosDeAnteErrorDeBd() {
        when(permisoRepository.findPermisosByUsuarioId(9L))
            .thenThrow(new DataAccessResourceFailureException("tabla ausente"));

        assertThat(authSupport.permisosDe(9L)).isEqualTo(List.of());
    }
}
