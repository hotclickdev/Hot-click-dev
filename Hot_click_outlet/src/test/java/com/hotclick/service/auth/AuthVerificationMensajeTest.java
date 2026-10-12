package com.hotclick.service.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ESC-3 | send-verification no devuelve SQL ni datos internos")
@org.junit.jupiter.api.extension.ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class AuthVerificationMensajeTest {

    @org.mockito.Mock org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @org.mockito.Mock com.hotclick.service.EmailVerificationService emailVerificationService;
    @org.mockito.Mock AuthSupport authSupport;
    @org.mockito.Mock com.hotclick.service.TurnstileService turnstileService;
    @org.mockito.Mock com.hotclick.service.SecurityAuditService securityAuditService;
    @org.mockito.InjectMocks AuthVerificationHandler handler;

    @Test
    @DisplayName("contraseña '123' → 400 con mensaje de largo, sin llegar al INSERT")
    void contrasenaCorta() {
        org.mockito.Mockito.when(turnstileService.verify(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(true);
        com.hotclick.model.Usuario u = new com.hotclick.model.Usuario();
        u.setCorreo("x@test.cr");
        u.setContrasenaHash("123");
        var res = handler.sendVerification(u, null, new org.springframework.mock.web.MockHttpServletRequest());
        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(res.getBody().getMessage()).isEqualTo(AuthVerificationHandler.MSG_CONTRASENA);
        org.mockito.Mockito.verifyNoInteractions(emailVerificationService);
    }

    @Test
    void errorDeBaseEsGenerico() {
        String sql = "could not execute statement [NULL not allowed for column \"NOMBRE\"; SQL statement: "
            + "insert into hot_click_usuario_tb (correo, nombre) values ('x@y.cr', NULL)]";
        String msg = AuthVerificationHandler.mensajePublico(new DataIntegrityViolationException(sql));
        assertThat(msg).isEqualTo(AuthVerificationHandler.MSG_GENERICO).doesNotContain("hot_click");
        assertThat(AuthVerificationHandler.mensajePublico(new RuntimeException("boom"))).isEqualTo(AuthVerificationHandler.MSG_GENERICO);
    }

    @Test
    void validacionPropiaSeMuestra() {
        assertThat(AuthVerificationHandler.mensajePublico(new IllegalArgumentException("El correo ya está registrado")))
            .isEqualTo("El correo ya está registrado");
    }
}
