package com.hotclick.service.auth;

import com.hotclick.model.Usuario;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.OtpService;
import com.hotclick.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** QA final 15-nov: alta sin contraseña dejaba una cuenta zombi (contrasena_hash NULL) con token emitido. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Alta sin contraseña: 400 y ninguna cuenta ni OTP")
class AltaSinClaveTest {

    @Mock PasswordEncoder passwordEncoder;
    @Mock EmailVerificationService emailVerificationService;
    @Mock AuthSupport authSupport;
    @Mock com.hotclick.service.TurnstileService turnstileService;
    @Mock com.hotclick.service.SecurityAuditService securityAuditService;
    @InjectMocks AuthVerificationHandler handler;

    private Usuario conClave(String clave) {
        Usuario u = new Usuario();
        u.setCorreo("nuevo@test.cr");
        u.setContrasenaHash(clave);
        return u;
    }

    private org.springframework.http.ResponseEntity<com.hotclick.dto.ResponseDTO> enviar(Usuario u) {
        when(turnstileService.verify(any(), any())).thenReturn(true);
        return handler.sendVerification(u, null, new MockHttpServletRequest());
    }

    @Test
    @DisplayName("sin contraseña (null) → 400, sin crear usuario ni enviar OTP")
    void sinClaveNula() {
        var res = enviar(conClave(null));
        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(res.getBody().getMessage()).isEqualTo("La contraseña es requerida");
        verifyNoInteractions(emailVerificationService);
    }

    @Test
    @DisplayName("contraseña vacía o en blanco → 400, sin usuario ni OTP")
    void sinClaveVacia() {
        for (String vacia : new String[] {"", "   "}) {
            var res = enviar(conClave(vacia));
            assertThat(res.getStatusCode().value()).isEqualTo(400);
            assertThat(res.getBody().getMessage()).isEqualTo("La contraseña es requerida");
        }
        verifyNoInteractions(emailVerificationService);
    }

    @Test
    @DisplayName("contraseña débil → misma política que el alta normal")
    void claveDebil() {
        var res = enviar(conClave("123"));
        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(res.getBody().getMessage()).startsWith("Te falta");
        verifyNoInteractions(emailVerificationService);
    }

    @Test
    @DisplayName("con contraseña válida → igual que antes: hashea y envía OTP")
    void conClaveValida() {
        when(passwordEncoder.encode("Segura123")).thenReturn("$hash");
        Usuario u = conClave("Segura123");
        u.setDeclaraMayoriaEdad(true);
        var res = enviar(u);
        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(u.getContrasenaHash()).isEqualTo("$hash");
        verify(emailVerificationService).iniciarRegistro(u);
    }

    // ── verify-registration: una cuenta pendiente ya zombi no se activa ni emite token ─────────────

    @Mock OtpService otpService;
    @Mock UsuarioService usuarioService;
    @InjectMocks EmailVerificationService verificacion;

    @Test
    @DisplayName("verificarYRegistrar con hash nulo → rechaza, no valida OTP ni activa")
    void verificarCuentaZombi() {
        Usuario zombi = new Usuario();
        zombi.setId(5L);
        zombi.setCorreo("zombi@test.cr");
        zombi.setEstado(com.hotclick.utils.Constants.ESTADO_PENDIENTE);
        when(usuarioService.buscarPorCorreo("zombi@test.cr")).thenReturn(Optional.of(zombi));

        assertThatThrownBy(() -> verificacion.verificarYRegistrar("zombi@test.cr", "123456"))
            .isInstanceOf(com.hotclick.exception.RecursoNoEncontradoException.class);
        verify(usuarioService, never()).activarUsuario(any());
        verifyNoInteractions(otpService);
    }
}
