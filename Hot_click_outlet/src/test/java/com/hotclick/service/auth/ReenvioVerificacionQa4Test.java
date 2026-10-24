package com.hotclick.service.auth;

import com.hotclick.model.Usuario;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.OtpService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("QA4-004 | reenvío del código de registro: genérico y sin crear cuentas")
class ReenvioVerificacionQa4Test {

    @ExtendWith(MockitoExtension.class)
    @org.junit.jupiter.api.Nested
    class Handler {
        @Mock PasswordEncoder passwordEncoder;
        @Mock EmailVerificationService emailVerificationService;
        @Mock AuthSupport authSupport;
        @Mock TurnstileService turnstileService;
        @Mock SecurityAuditService securityAuditService;
        @InjectMocks AuthVerificationHandler handler;

        private Usuario soloCorreo() {
            Usuario u = new Usuario();
            u.setCorreo("pendiente@test.cr");
            return u;
        }

        @Test
        void reenvioRespondeGenericoYNoRegistra() {
            when(turnstileService.verify(any(), any())).thenReturn(true);
            var res = handler.sendVerification(soloCorreo(), null, new MockHttpServletRequest());
            assertThat(res.getStatusCode().value()).isEqualTo(200);
            assertThat(res.getBody().getMessage()).isEqualTo(AuthVerificationHandler.MSG_REENVIO);
            verify(emailVerificationService).reenviarSiPendiente("pendiente@test.cr");
            verify(emailVerificationService, never()).iniciarRegistro(any());
            verifyNoInteractions(passwordEncoder);
        }

        @Test
        void reenvioConErrorTambienEsGenerico() {
            when(turnstileService.verify(any(), any())).thenReturn(true);
            doThrow(new IllegalArgumentException("El correo ya está registrado"))
                .when(emailVerificationService).reenviarSiPendiente(any());
            var res = handler.sendVerification(soloCorreo(), null, new MockHttpServletRequest());
            assertThat(res.getStatusCode().value()).isEqualTo(200);
            assertThat(res.getBody().getMessage()).isEqualTo(AuthVerificationHandler.MSG_REENVIO);
        }

        @Test
        void reenvioSinTurnstileFallaCerrado() {
            when(turnstileService.verify(any(), any())).thenReturn(false);
            var res = handler.sendVerification(soloCorreo(), null, new MockHttpServletRequest());
            assertThat(res.getStatusCode().value()).isEqualTo(400);
            verifyNoInteractions(emailVerificationService);
        }
    }

    @ExtendWith(MockitoExtension.class)
    @org.junit.jupiter.api.Nested
    class Servicio {
        @Mock OtpService otpService;
        @Mock UsuarioService usuarioService;
        @InjectMocks EmailVerificationService service;

        private Usuario conEstado(int estado) {
            Usuario u = new Usuario();
            u.setCorreo("a@test.cr");
            u.setEstado(estado);
            return u;
        }

        @Test
        void pendienteRecibeCodigo() {
            Usuario u = conEstado(Constants.ESTADO_PENDIENTE);
            when(usuarioService.buscarPorCorreo("a@test.cr")).thenReturn(Optional.of(u));
            service.reenviarSiPendiente(" A@test.cr ");
            verify(otpService).enviarOtp(u, Constants.OTP_TIPO_REGISTRO);
        }

        @Test
        void activaOInexistenteNoRecibeNadaNiSeCrea() {
            when(usuarioService.buscarPorCorreo("a@test.cr")).thenReturn(Optional.of(conEstado(Constants.ESTADO_ACTIVO)));
            service.reenviarSiPendiente("a@test.cr");
            when(usuarioService.buscarPorCorreo("a@test.cr")).thenReturn(Optional.empty());
            service.reenviarSiPendiente("a@test.cr");
            service.reenviarSiPendiente(null);
            verifyNoInteractions(otpService);
            verify(usuarioService, never()).registrarPendiente(any());
        }
    }
}
