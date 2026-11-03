package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.RateLimitingFilter;
import com.hotclick.service.OtpService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("QA4-004: reenvío de verificación sin enumeración y con tope")
class ReenvioVerificacionServiceTest {

    private UsuarioService usuarioService;
    private OtpService otpService;
    private RateLimiter rateLimiter;
    private ReenvioVerificacionService service;

    @BeforeEach
    void setUp() {
        usuarioService = mock(UsuarioService.class);
        otpService = mock(OtpService.class);
        rateLimiter = mock(RateLimiter.class);
        when(rateLimiter.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        service = new ReenvioVerificacionService(usuarioService, otpService, rateLimiter, Runnable::run);
    }

    private static Usuario usuario(int estado) {
        Usuario u = new Usuario();
        u.setCorreo("persona@example.com");
        u.setEstado(estado);
        return u;
    }

    private void assertGenerico(ResponseEntity<ResponseDTO> r) {
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody().getMessage()).isEqualTo(ReenvioVerificacionService.MSG_GENERICO);
        assertThat(r.getBody().getData()).isNull();
    }

    @Test
    void cuentaPendiente_respuestaGenericaYEnviaCodigo() {
        Usuario u = usuario(Constants.ESTADO_PENDIENTE);
        when(usuarioService.buscarPorCorreo("persona@example.com")).thenReturn(Optional.of(u));
        assertGenerico(service.reenviar("  Persona@Example.com "));
        verify(otpService).enviarOtp(u, Constants.OTP_TIPO_REGISTRO);
    }

    @Test
    void cuentaInexistente_mismaRespuestaYNoEnvia() {
        when(usuarioService.buscarPorCorreo(anyString())).thenReturn(Optional.empty());
        assertGenerico(service.reenviar("nadie@example.com"));
        verifyNoInteractions(otpService);
    }

    @Test
    void cuentaYaVerificada_mismaRespuestaYNoEnvia() {
        when(usuarioService.buscarPorCorreo(anyString())).thenReturn(Optional.of(usuario(Constants.ESTADO_ACTIVO)));
        assertGenerico(service.reenviar("persona@example.com"));
        verifyNoInteractions(otpService);
    }

    @Test
    void errorAlEnviar_noCambiaLaRespuesta() {
        when(usuarioService.buscarPorCorreo(anyString())).thenReturn(Optional.of(usuario(Constants.ESTADO_PENDIENTE)));
        doThrow(new IllegalStateException("Demasiadas solicitudes")).when(otpService).enviarOtp(any(), anyString());
        assertGenerico(service.reenviar("persona@example.com"));
    }

    @Test
    void topePorCorreo_429SinBuscarLaCuentaYClaveSinPii() {
        when(rateLimiter.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(false);
        ResponseEntity<ResponseDTO> r = service.reenviar("persona@example.com");
        assertThat(r.getStatusCode().value()).isEqualTo(429);
        verifyNoInteractions(usuarioService, otpService);
        verify(rateLimiter).tryAcquire(argThat(k -> k.startsWith("reenvio-verif:correo:") && !k.contains("@")),
            eq(3), eq(900));
    }

    @Test
    void topePorIp_enElFiltro() throws Exception {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("1.2.3.4");
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:/api/auth/reenviar-verificacion"), eq(3), eq(300))).thenReturn(false);
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(new MockHttpServletRequest("POST", "/api/auth/reenviar-verificacion"), res, new MockFilterChain());
        assertThat(res.getStatus()).isEqualTo(429);
    }
}
