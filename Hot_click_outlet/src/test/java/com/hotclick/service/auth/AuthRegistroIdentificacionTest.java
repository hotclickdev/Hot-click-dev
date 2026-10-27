package com.hotclick.service.auth;

import com.hotclick.dto.RegisterRequest;
import com.hotclick.model.Usuario;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** E2E-REG-01: /api/auth/register debe mandar identificacion (NOT NULL) aunque el formulario no la pida. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthRegistroIdentificacionTest {

    @Mock TurnstileService turnstileService;
    @Mock SecurityAuditService securityAuditService;
    @Mock UsuarioService usuarioService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock TelegramService telegramService;
    @InjectMocks AuthRegistrationService service;

    @Test
    @DisplayName("E2E-REG-01: registro local asigna identificacion interna no nula, ≤20 y única")
    void registroAsignaIdentificacion() {
        when(turnstileService.verify(any(), any())).thenReturn(true);
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(usuarioService.registrarSolicitud(any())).thenAnswer(i -> i.getArgument(0));

        RegisterRequest req = new RegisterRequest();
        req.setNombre("Comprador E2E");
        req.setCorreo("e2e@example.test");
        req.setContrasena("E2e-Aa1!xyz");
        req.setDeclaraMayoriaEdad(true);

        var res = service.register(req, mock(HttpServletRequest.class));

        ArgumentCaptor<Usuario> cap = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioService).registrarSolicitud(cap.capture());
        String ident = cap.getValue().getIdentificacion();
        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(ident).isNotBlank().startsWith("REG-").hasSizeLessThanOrEqualTo(20);
        assertThat(AuthRegistrationService.identificacionInterna()).isNotEqualTo(AuthRegistrationService.identificacionInterna());
    }
}
