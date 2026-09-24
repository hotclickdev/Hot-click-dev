package com.hotclick.service.auth;

import com.hotclick.model.RefreshToken;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.nullable;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthRefreshHandler — cookie + rotación")
class AuthRefreshHandlerTest {

    @Mock private JwtUtil jwtUtil;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private AuthSupport authSupport;
    @Mock private SecurityAuditService securityAuditService;
    @Mock private UsuarioService usuarioService;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    @InjectMocks private AuthRefreshHandler handler;

    private Usuario usuario;
    private RefreshToken rotated;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(9L);
        usuario.setCorreo("a@hotclick.cr");
        Rol rol = new Rol();
        rol.setNombreRol("EMPRENDEDOR");
        usuario.setRoles(List.of(rol));

        rotated = new RefreshToken();
        rotated.setUsuario(usuario);
        rotated.setRawToken("new-raw-uuid");
        rotated.setToken(RefreshTokenService.hashToken("new-raw-uuid"));
    }

    @Test
    @DisplayName("refresh con cookie → rota y devuelve accessToken")
    void refresh_fromCookie_rotatesAndReturnsAccess() {
        when(refreshTokenService.readCookie(request)).thenReturn("old-raw");
        when(refreshTokenService.rotar("old-raw", request)).thenReturn(rotated);
        when(authSupport.permisosDe(9L)).thenReturn(List.of("pos.usar"));
        when(jwtUtil.generateTokenFull(any(), any(), any(), nullable(Long.class), nullable(String.class), any()))
            .thenReturn("access.jwt");

        ResponseEntity<?> resp = handler.refresh(Map.of(), request, response);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertThat(body).containsEntry("accessToken", "access.jwt");
        verify(refreshTokenService).writeCookie(response, "new-raw-uuid");
    }

    @Test
    @DisplayName("refresh sin cookie usa body legacy")
    void refresh_fallsBackToBody() {
        when(refreshTokenService.readCookie(request)).thenReturn(null);
        when(refreshTokenService.rotar("from-body", request)).thenReturn(rotated);
        when(authSupport.permisosDe(9L)).thenReturn(List.of());
        when(jwtUtil.generateTokenFull(any(), any(), any(), nullable(Long.class), nullable(String.class), any()))
            .thenReturn("access.jwt");

        ResponseEntity<?> resp = handler.refresh(Map.of("refreshToken", "from-body"), request, response);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(refreshTokenService).rotar("from-body", request);
    }

    @Test
    @DisplayName("refresh sin token → 400")
    void refresh_missingToken_badRequest() {
        when(refreshTokenService.readCookie(request)).thenReturn(null);

        ResponseEntity<?> resp = handler.refresh(Map.of(), request, response);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(refreshTokenService, never()).rotar(any(), any());
    }

    @Test
    @DisplayName("refresh con reuso → 401 y limpia cookie")
    void refresh_reuse_unauthorizedClearsCookie() {
        when(refreshTokenService.readCookie(request)).thenReturn("stolen");
        when(refreshTokenService.rotar("stolen", request))
            .thenThrow(new IllegalStateException("Sesión inválida. Iniciá sesión de nuevo."));

        ResponseEntity<?> resp = handler.refresh(null, request, response);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenService).clearCookie(response);
    }

    @Test
    @DisplayName("logout sin body revoca por cookie Path si llega; siempre limpia cookie")
    void logout_clearsCookie() {
        when(refreshTokenService.readCookie(request)).thenReturn("raw-in-cookie");

        ResponseEntity<?> resp = handler.logout(Map.of(), request, response);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(refreshTokenService).revocar("raw-in-cookie");
        verify(refreshTokenService).clearCookie(response);
    }
}
