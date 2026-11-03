package com.hotclick.service.auth;

import com.hotclick.dto.RegisterRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Mentor: el registro de comprador exige 8 + mayúscula + número y dice exactamente qué falta (voseo). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthRegistroClavePoliticaTest {

    @Mock TurnstileService turnstileService;
    @Mock SecurityAuditService securityAuditService;
    @Mock UsuarioService usuarioService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock TelegramService telegramService;
    @InjectMocks AuthRegistrationService service;

    private ResponseEntity<ResponseDTO> registrar(String clave) {
        when(turnstileService.verify(any(), any())).thenReturn(true);
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(usuarioService.registrarSolicitud(any())).thenAnswer(i -> i.getArgument(0));
        RegisterRequest req = new RegisterRequest();
        req.setNombre("Ana");
        req.setCorreo("ana@example.test");
        req.setContrasena(clave);
        req.setDeclaraMayoriaEdad(true);
        return service.register(req, mock(HttpServletRequest.class));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "Abcdef1  | Te falta llegar a 8 caracteres",
        "abcdefg1 | Te falta una mayúscula",
        "Abcdefgh | Te falta un número",
        "abcdefgh | Te falta una mayúscula y un número",
        "abc      | Te falta llegar a 8 caracteres, una mayúscula y un número",
    })
    void registroRechazaYDiceQueFalta(String clave, String mensaje) {
        var res = registrar(clave);
        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(res.getBody().getMessage()).isEqualTo(mensaje);
        verify(usuarioService, never()).registrarSolicitud(any());
    }

    @Test
    void registroAceptaClaveQueCumple() {
        assertThat(registrar("Abcdefg1").getStatusCode().is2xxSuccessful()).isTrue();
        verify(usuarioService).registrarSolicitud(any());
    }
}
