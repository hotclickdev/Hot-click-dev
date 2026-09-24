package com.hotclick.service.auth;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.OtpService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.SecurityDetectionService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import com.hotclick.service.WebAuthnService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthCredentialLoginHandler — contrato anti-enumeración")
class AuthCredentialLoginHandlerTest {

    private static final String CORREO = "user@example.com";
    private static final String CLAVE = "secreta123";
    private static final String HASH_REAL = "$2b$12$realhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

    @Mock UsuarioService usuarioService;
    @Mock JwtUtil jwtUtil;
    @Mock PasswordEncoder passwordEncoder;
    @Mock WebAuthnService webAuthnService;
    @Mock MiembroEmpresaRepository miembroEmpresaRepository;
    @Mock SecurityAuditService securityAuditService;
    @Mock SecurityDetectionService securityDetectionService;
    @Mock TurnstileService turnstileService;
    @Mock AuthSupport authSupport;
    @Mock OtpService otpService;
    @Mock HttpServletRequest httpRequest;

    @InjectMocks AuthCredentialLoginHandler handler;

    @BeforeEach
    void turnstileOk() {
        when(turnstileService.verify(any(), any())).thenReturn(true);
        when(securityAuditService.getIp(httpRequest)).thenReturn("127.0.0.1");
    }

    @Test
    @DisplayName("correo inexistente → 401 Credenciales inválidas + audit user_not_found + dummy matches")
    void usuarioInexistente() {
        JwtRequest req = request();
        when(usuarioService.buscarPorCorreo(CORREO)).thenReturn(Optional.empty());
        when(passwordEncoder.matches(eq(CLAVE), anyString())).thenReturn(false);

        ResponseEntity<?> resp = handler.login(req, httpRequest);

        assertCredencialesInvalidas(resp);
        verify(passwordEncoder).matches(eq(CLAVE), anyString());
        verify(securityAuditService).logLoginFailed(CORREO, httpRequest, "user_not_found");
        verify(securityDetectionService).recordFailedLogin("127.0.0.1", CORREO);
        verify(otpService, never()).enviarOtp(any(), anyString());
    }

    @Test
    @DisplayName("clave incorrecta → 401 Credenciales inválidas + audit wrong_password")
    void claveIncorrecta() {
        Usuario u = usuarioActivo();
        when(usuarioService.buscarPorCorreo(CORREO)).thenReturn(Optional.of(u));
        when(passwordEncoder.matches(CLAVE, HASH_REAL)).thenReturn(false);

        ResponseEntity<?> resp = handler.login(request(), httpRequest);

        assertCredencialesInvalidas(resp);
        verify(securityAuditService).logLoginFailed(CORREO, httpRequest, "wrong_password");
        verify(securityDetectionService).recordFailedLogin("127.0.0.1", CORREO);
        verify(usuarioService).incrementarIntentosFallidos(u.getId());
        verify(otpService, never()).enviarOtp(any(), anyString());
    }

    @Test
    @DisplayName("pendiente + clave ok → 403 y reenvía OTP de registro")
    void pendienteReenviaVerificacion() {
        Usuario u = usuarioConEstado(Constants.ESTADO_PENDIENTE);
        when(usuarioService.buscarPorCorreo(CORREO)).thenReturn(Optional.of(u));
        when(passwordEncoder.matches(CLAVE, HASH_REAL)).thenReturn(true);

        ResponseEntity<?> resp = handler.login(request(), httpRequest);

        assertCuentaBloqueada(resp, "Verificá tu correo para activar la cuenta.");
        verify(otpService).enviarOtp(u, Constants.OTP_TIPO_REGISTRO);
        verify(securityAuditService, never()).logLoginFailed(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("pendiente + fallo de mail → igual 403, no rompe login")
    void pendienteMailFallaNoRompe() {
        Usuario u = usuarioConEstado(Constants.ESTADO_PENDIENTE);
        when(usuarioService.buscarPorCorreo(CORREO)).thenReturn(Optional.of(u));
        when(passwordEncoder.matches(CLAVE, HASH_REAL)).thenReturn(true);
        org.mockito.Mockito.doThrow(new RuntimeException("smtp down"))
            .when(otpService).enviarOtp(u, Constants.OTP_TIPO_REGISTRO);

        ResponseEntity<?> resp = handler.login(request(), httpRequest);

        assertCuentaBloqueada(resp, "Verificá tu correo para activar la cuenta.");
    }

    @ParameterizedTest
    @ValueSource(ints = {
        Constants.ESTADO_INACTIVO,
        Constants.ESTADO_SUSPENDIDO,
        Constants.ESTADO_ELIMINADO
    })
    @DisplayName("inactivo/suspendido/eliminado + clave ok → 403 con mensaje genérico (sin distinguir el motivo)")
    void estadosRechazadosSinEnumeracion(int estado) {
        Usuario u = usuarioConEstado(estado);
        when(usuarioService.buscarPorCorreo(CORREO)).thenReturn(Optional.of(u));
        when(passwordEncoder.matches(CLAVE, HASH_REAL)).thenReturn(true);

        ResponseEntity<?> resp = handler.login(request(), httpRequest);

        assertCuentaBloqueada(resp, "Credenciales inválidas");
        verify(otpService, never()).enviarOtp(any(), anyString());
    }

    private static void assertCredencialesInvalidas(ResponseEntity<?> resp) {
        assertThat(resp.getStatusCode().value()).isEqualTo(401);
        assertThat(resp.getBody()).isInstanceOf(ResponseDTO.class);
        ResponseDTO body = (ResponseDTO) resp.getBody();
        assertThat(body.getMessage()).isEqualTo("Credenciales inválidas");
        assertThat(body.isSuccess()).isFalse();
    }

    /**
     * Estado inválido (pendiente/suspendido/inactivo/eliminado) con credenciales
     * correctas → 403, no 401: ya se probó la contraseña, así que el status code
     * distingue "cuenta bloqueada" de "credenciales incorrectas" sin necesidad de
     * un mensaje distinto (salvo pendiente, que sí guía a verificar el correo).
     */
    private static void assertCuentaBloqueada(ResponseEntity<?> resp, String mensajeEsperado) {
        assertThat(resp.getStatusCode().value()).isEqualTo(403);
        assertThat(resp.getBody()).isInstanceOf(ResponseDTO.class);
        ResponseDTO body = (ResponseDTO) resp.getBody();
        assertThat(body.getMessage()).isEqualTo(mensajeEsperado);
        assertThat(body.isSuccess()).isFalse();
    }

    private static JwtRequest request() {
        JwtRequest req = new JwtRequest();
        req.setCorreo(CORREO);
        req.setContrasena(CLAVE);
        req.setTurnstileToken("token");
        return req;
    }

    private static Usuario usuarioActivo() {
        return usuarioConEstado(Constants.ESTADO_ACTIVO);
    }

    private static Usuario usuarioConEstado(int estado) {
        Usuario u = new Usuario();
        u.setId(10L);
        u.setCorreo(CORREO);
        u.setContrasenaHash(HASH_REAL);
        u.setEstado(estado);
        return u;
    }
}
