package com.hotclick.service.auth;

import com.hotclick.dto.RegisterRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.OtpService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** O7 (QA final 23-nov): POST /auth/register promete «Verificá tu correo» y por eso debe emitir el OTP de registro. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("POST /auth/register envía el OTP de verificación")
class AuthRegistroEnviaOtpTest {

    @Mock TurnstileService turnstileService;
    @Mock SecurityAuditService securityAuditService;
    @Mock UsuarioService usuarioService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock TelegramService telegramService;
    @Mock OtpService otpService;
    @InjectMocks AuthRegistrationService service;

    @BeforeEach
    void setUp() {
        when(turnstileService.verify(any(), any())).thenReturn(true);
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(usuarioService.registrarSolicitud(any())).thenAnswer(i -> i.getArgument(0));
    }

    private ResponseEntity<ResponseDTO> registrar() {
        RegisterRequest req = new RegisterRequest();
        req.setNombre("Ana");
        req.setCorreo("ana@qf23.test");
        req.setContrasena("Abcdefg1");
        req.setDeclaraMayoriaEdad(true);
        return service.register(req, mock(HttpServletRequest.class));
    }

    @Test
    @DisplayName("registro correcto: emite el OTP de registro a la cuenta PENDIENTE")
    void enviaOtp() {
        assertThat(registrar().getStatusCode().is2xxSuccessful()).isTrue();
        verify(otpService).enviarOtp(any(Usuario.class), eq(Constants.OTP_TIPO_REGISTRO));
    }

    @Test
    @DisplayName("si el envío del OTP falla, la cuenta queda creada y la respuesta sigue siendo 200")
    void falloDeEnvioNoRompeRegistro() {
        doThrow(new IllegalStateException("tope")).when(otpService).enviarOtp(any(), any());
        assertThat(registrar().getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("si el registro se rechaza (correo repetido), no se envía ningún OTP")
    void sinRegistroNoHayOtp() {
        when(usuarioService.registrarSolicitud(any())).thenThrow(new IllegalArgumentException("El correo ya está registrado"));
        assertThat(registrar().getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(otpService);
    }
}
