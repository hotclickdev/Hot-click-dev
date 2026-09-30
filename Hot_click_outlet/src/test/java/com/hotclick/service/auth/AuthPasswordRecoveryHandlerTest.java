package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Recuperar contraseña — respuestas sin enumeración y reset atado al código")
class AuthPasswordRecoveryHandlerTest {

    @Mock private PasswordResetService passwordResetService;
    @Mock private SecurityAuditService securityAuditService;
    @Mock private HttpServletRequest request;

    private final AuthPasswordRecoveryHandler handler = new AuthPasswordRecoveryHandler();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(handler, "passwordResetService", passwordResetService);
        ReflectionTestUtils.setField(handler, "securityAuditService", securityAuditService);
    }

    private static String mensaje(ResponseEntity<ResponseDTO> r) {
        return r.getBody() == null ? null : r.getBody().getMessage();
    }

    @Test
    @DisplayName("forgot-password responde igual aunque se exceda el límite o falle el envío")
    void forgotSiempreIgual() {
        ResponseEntity<ResponseDTO> ok = handler.forgotPassword(Map.of("correo", "nadie@correo.com"), request);

        doThrow(new IllegalStateException("Demasiadas solicitudes"))
            .when(passwordResetService).enviarCodigo("limite@correo.com");
        ResponseEntity<ResponseDTO> limitado = handler.forgotPassword(Map.of("correo", "limite@correo.com"), request);

        assertThat(ok.getStatusCode().value()).isEqualTo(200);
        assertThat(limitado.getStatusCode().value()).isEqualTo(200);
        assertThat(mensaje(limitado)).isEqualTo(mensaje(ok));
    }

    @Test
    @DisplayName("verify-code usa el mismo mensaje para correo inexistente y código incorrecto")
    void verifyMensajeUnico() {
        doThrow(new IllegalStateException(PasswordResetService.MSG_SIN_CODIGO_ACTIVO))
            .when(passwordResetService).verificarCodigo("nadie@correo.com", "123456");
        doThrow(new IllegalArgumentException("Código incorrecto. 4 intento(s) restante(s)."))
            .when(passwordResetService).verificarCodigo("ana@correo.com", "123456");

        ResponseEntity<ResponseDTO> inexistente = handler.verifyCode(Map.of("correo", "nadie@correo.com", "codigo", "123456"));
        ResponseEntity<ResponseDTO> incorrecto  = handler.verifyCode(Map.of("correo", "ana@correo.com", "codigo", "123456"));

        assertThat(inexistente.getStatusCode().value()).isEqualTo(400);
        assertThat(mensaje(inexistente)).isEqualTo(mensaje(incorrecto));
    }

    @Test
    @DisplayName("reset-password sin código se rechaza sin tocar la contraseña")
    void resetSinCodigo() {
        ResponseEntity<ResponseDTO> r = handler.resetPassword(
            Map.of("correo", "ana@correo.com", "nuevaContrasena", "otraclave123"), request);

        assertThat(r.getStatusCode().value()).isEqualTo(400);
        verify(passwordResetService, never()).cambiarContrasena(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("reset-password rechaza una contraseña igual al correo")
    void resetIgualAlCorreo() {
        ResponseEntity<ResponseDTO> r = handler.resetPassword(
            Map.of("correo", "ana.solis@gmail.com", "codigo", "123456", "nuevaContrasena", "ANA.SOLIS@gmail.com"), request);

        assertThat(r.getStatusCode().value()).isEqualTo(400);
        assertThat(mensaje(r)).isEqualTo(AuthPasswordRecoveryHandler.MSG_CONTRASENA);
    }

    @Test
    @DisplayName("reset-password con código válido cambia la contraseña y audita")
    void resetOk() {
        Usuario u = new Usuario();
        u.setCorreo("ana@correo.com");
        when(passwordResetService.cambiarContrasena("ana@correo.com", "123456", "otraclave123")).thenReturn(Optional.of(u));

        ResponseEntity<ResponseDTO> r = handler.resetPassword(
            Map.of("correo", "ana@correo.com", "codigo", "123456", "nuevaContrasena", "otraclave123"), request);

        assertThat(r.getStatusCode().value()).isEqualTo(200);
        verify(securityAuditService).logPasswordResetSuccess(u.getId(), "ana@correo.com", request);
    }

    @Test
    @DisplayName("Política: entre 8 y 128 caracteres y distinta del correo")
    void politica() {
        assertThat(AuthSupport.esContrasenaRecuperacionValida("corta", "a@b.com")).isFalse();
        assertThat(AuthSupport.esContrasenaRecuperacionValida("x".repeat(129), "a@b.com")).isFalse();
        assertThat(AuthSupport.esContrasenaRecuperacionValida("x".repeat(128), "a@b.com")).isTrue();
        assertThat(AuthSupport.esContrasenaRecuperacionValida("frase larga segura", "a@b.com")).isTrue();
        assertThat(AuthSupport.esContrasenaRecuperacionValida("ana@correo.com", "ANA@correo.com")).isFalse();
    }
}
