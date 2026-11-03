package com.hotclick.controller;

import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.WebAuthnService;
import com.hotclick.service.auth.AuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** LOW de Seguridad sobre #414: limpiar los contadores ANTES de emitir tokens; si falla, no queda un refresh token huérfano. */
@DisplayName("[WebAuthn] login/finish limpia contadores antes de emitir el refresh token")
class WebAuthnLoginOrdenTest {

    private WebAuthnService svc;
    private UsuarioRepository repo;
    private RefreshTokenService refresh;
    private AuthSupport authSupport;
    private WebAuthnController controller;
    private Usuario usuario;

    @BeforeEach
    void setUp() throws Exception {
        svc = mock(WebAuthnService.class);
        repo = mock(UsuarioRepository.class);
        refresh = mock(RefreshTokenService.class);
        authSupport = mock(AuthSupport.class);
        PermisoRepository permisos = mock(PermisoRepository.class);
        when(permisos.findPermisosByUsuarioId(anyLong())).thenReturn(List.of());
        controller = new WebAuthnController(svc, repo, mock(JwtUtil.class), refresh, permisos, authSupport);
        usuario = new Usuario();
        usuario.setId(9L);
        usuario.setCorreo("ana@correo.com");
        when(svc.finishAuthentication(eq("ana@correo.com"), anyString())).thenReturn(true);
        when(repo.findByCorreo("ana@correo.com")).thenReturn(Optional.of(usuario));
    }

    private org.springframework.http.ResponseEntity<?> finish() {
        return controller.loginFinish(Map.of("email", "ana@correo.com", "response", "{}"), new MockHttpServletRequest());
    }

    @Test
    @DisplayName("Orden: autenticacionCompleta va antes de refreshTokenService.crear")
    void limpiaAntesDeEmitir() {
        assertThat(finish().getStatusCode().value()).isEqualTo(200);
        InOrder orden = inOrder(authSupport, refresh);
        orden.verify(authSupport).autenticacionCompleta(eq(9L), any());
        orden.verify(refresh).crear(usuario);
    }

    @Test
    @DisplayName("Si limpiar los contadores falla: 401 genérico y NO se crea ningún refresh token")
    void falloAlLimpiarNoDejaTokenHuerfano() {
        doThrow(new IllegalStateException("caida")).when(authSupport).autenticacionCompleta(anyLong(), any());

        var r = finish();

        assertThat(r.getStatusCode().value()).isEqualTo(401);
        verify(refresh, never()).crear(any());
    }
}
