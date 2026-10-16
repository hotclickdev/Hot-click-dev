package com.hotclick.service.auth;

import com.hotclick.exception.RegistroDuplicadoException;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.RateLimitingFilter;
import com.hotclick.security.RespuestaUniforme;
import com.hotclick.service.EmailVerificationService;
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
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Registro de comprador: sin enumeración de cédula ni de correo")
@ExtendWith(MockitoExtension.class)
class RegistroEnumeracionTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock RolRepository rolRepository;
    @InjectMocks UsuarioService usuarioService;

    private static Usuario alta(String correo, String cedula) {
        Usuario u = new Usuario();
        u.setCorreo(correo);
        u.setIdentificacion(cedula);
        return u;
    }

    @Test
    @DisplayName("correo duplicado → «ya está registrado» con solo el enlace de recuperar; cédula → genérico")
    void correoSeDiceCedulaNo() {
        when(usuarioRepository.existsByCorreoAndEstadoNot(eq("ya@test.cr"), anyInt())).thenReturn(true);
        Throwable porCorreo = catchThrowable(() -> usuarioService.registrarPendiente(alta("ya@test.cr", null)));

        when(usuarioRepository.existsByCorreoAndEstadoNot(eq("nuevo@test.cr"), anyInt())).thenReturn(false);
        when(usuarioRepository.existsByIdentificacionAndEstadoNot(eq("101110111"), anyInt())).thenReturn(true);
        Throwable porCedula = catchThrowable(() -> usuarioService.registrarPendiente(alta("nuevo@test.cr", "101110111")));

        assertThat(porCorreo).isExactlyInstanceOf(RegistroDuplicadoException.class).hasMessage(RegistroDuplicadoException.MENSAJE_CORREO);
        assertThat(((RegistroDuplicadoException) porCorreo).datosRespuesta())
            .containsOnlyKeys("recuperar").containsEntry("recuperar", RegistroDuplicadoException.RUTA_RECUPERAR);
        assertThat(porCedula).isExactlyInstanceOf(RegistroDuplicadoException.class).hasMessage(RegistroDuplicadoException.MENSAJE);
        assertThat(((RegistroDuplicadoException) porCedula).datosRespuesta()).isNull();
        assertThat(porCedula.getMessage()).doesNotContainIgnoringCase("identificación").doesNotContainIgnoringCase("cédula");
    }

    @Test
    @DisplayName("registrarSolicitud (/register) tampoco revela si la cédula existe")
    void solicitudGenerica() {
        when(usuarioRepository.existsByCorreoAndEstadoNot(any(), anyInt())).thenReturn(false);
        when(usuarioRepository.existsByIdentificacionAndEstadoNot(any(), anyInt())).thenReturn(true);
        Throwable t = catchThrowable(() -> usuarioService.registrarSolicitud(alta("a@test.cr", "101110111")));
        assertThat(t).isExactlyInstanceOf(RegistroDuplicadoException.class);
    }

    @Test
    @DisplayName("send-verification: correo → 400 + enlace recuperar; cédula → 400 genérico sin datos")
    void handlerMismoStatus() throws Exception {
        AuthVerificationHandler handler = new AuthVerificationHandler();
        EmailVerificationService ev = mock(EmailVerificationService.class);
        TurnstileService ts = mock(TurnstileService.class);
        when(ts.verify(any(), any())).thenReturn(true);
        ReflectionTestUtils.setField(handler, "emailVerificationService", ev);
        ReflectionTestUtils.setField(handler, "turnstileService", ts);
        ReflectionTestUtils.setField(handler, "securityAuditService", mock(SecurityAuditService.class));
        doThrow(RegistroDuplicadoException.porCorreo()).doThrow(RegistroDuplicadoException.porCedula())
            .when(ev).iniciarRegistro(any());

        var r1 = handler.sendVerification(alta("ya@test.cr", null), null, new MockHttpServletRequest());
        var r2 = handler.sendVerification(alta("nuevo@test.cr", "101110111"), null, new MockHttpServletRequest());
        assertThat(r1.getStatusCode().value()).isEqualTo(400).isEqualTo(r2.getStatusCode().value());
        assertThat(r1.getBody().getMessage()).isEqualTo(RegistroDuplicadoException.MENSAJE_CORREO);
        assertThat(r1.getBody().getData()).isEqualTo(java.util.Map.of("recuperar", RegistroDuplicadoException.RUTA_RECUPERAR));
        assertThat(r2.getBody().getMessage()).isEqualTo(RegistroDuplicadoException.MENSAJE);
        assertThat(r2.getBody().getData()).isNull();
    }

    @Test
    @DisplayName("send-verification: un duplicado no responde antes del piso de tiempo")
    void pisoDeTiempoEnDuplicado() throws Exception {
        AuthVerificationHandler handler = new AuthVerificationHandler();
        EmailVerificationService ev = mock(EmailVerificationService.class);
        TurnstileService ts = mock(TurnstileService.class);
        when(ts.verify(any(), any())).thenReturn(true);
        ReflectionTestUtils.setField(handler, "emailVerificationService", ev);
        ReflectionTestUtils.setField(handler, "turnstileService", ts);
        ReflectionTestUtils.setField(handler, "securityAuditService", mock(SecurityAuditService.class));
        ReflectionTestUtils.setField(handler, "respuestaMinMs", 200L);
        doThrow(RegistroDuplicadoException.porCorreo()).when(ev).iniciarRegistro(any());

        long t0 = System.nanoTime();
        handler.sendVerification(alta("ya@test.cr", null), null, new MockHttpServletRequest());
        assertThat((System.nanoTime() - t0) / 1_000_000L).isGreaterThanOrEqualTo(195L);
    }

    @Test
    @DisplayName("RespuestaUniforme: no duerme si ya pasó el piso, ni con piso 0")
    void respuestaUniformeSinEsperaExtra() {
        long t0 = System.nanoTime();
        RespuestaUniforme.esperarMinimo(t0, 0);
        RespuestaUniforme.esperarMinimo(t0 - 5_000_000_000L, 100);
        assertThat((System.nanoTime() - t0) / 1_000_000L).isLessThan(90L);
    }

    @Test
    @DisplayName("EmailVerificationService: correo ACTIVO → «ya está registrado»")
    void correoActivoGenerico() {
        UsuarioService us = mock(UsuarioService.class);
        Usuario activo = alta("ya@test.cr", null);
        activo.setEstado(Constants.ESTADO_ACTIVO);
        when(us.buscarPorCorreo("ya@test.cr")).thenReturn(java.util.Optional.of(activo));
        EmailVerificationService ev = new EmailVerificationService();
        ReflectionTestUtils.setField(ev, "usuarioService", us);
        Throwable t = catchThrowable(() -> ev.iniciarRegistro(alta("ya@test.cr", null)));
        assertThat(t).isExactlyInstanceOf(RegistroDuplicadoException.class).hasMessage(RegistroDuplicadoException.MENSAJE_CORREO);
    }

    private static RateLimitingFilter filtro(RateLimiter rl, com.hotclick.security.ClientIpResolver ip) {
        RateLimitingFilter f = new RateLimitingFilter();
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(SecurityAuditService.class));
        return f;
    }

    @Test
    @DisplayName("todas las altas: 5 por 15 min por IP → 429")
    void rateLimit15Min() throws Exception {
        for (String ruta : new String[]{"/api/auth/send-verification", "/api/auth/register",
                "/api/auth/registro-empresa", "/api/public/tienda-rapida/tok123"}) {
            RateLimiter rl = mock(RateLimiter.class);
            when(rl.tryAcquire(org.mockito.ArgumentMatchers.endsWith(":altas-dia"), anyInt(), anyInt())).thenReturn(true);
            when(rl.tryAcquire(org.mockito.ArgumentMatchers.argThat(k -> k != null && !k.endsWith(":altas-dia")), anyInt(), anyInt())).thenReturn(false);
            MockHttpServletRequest req = new MockHttpServletRequest("POST", ruta);
            req.setRemoteAddr("203.0.113.9");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filtro(rl, new com.hotclick.security.ClientIpResolver("127.0.0.1/32")).doFilter(req, res, new MockFilterChain());
            assertThat(res.getStatus()).as(ruta).isEqualTo(429);
            verify(rl).tryAcquire(org.mockito.ArgumentMatchers.startsWith("ip:203.0.113.9:"), eq(5), eq(900));
        }
    }

    @Test
    @DisplayName("tope diario: 20 altas por IP y día, compartido entre rutas")
    void topeDiario() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(false);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/register");
        req.setRemoteAddr("203.0.113.9");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filtro(rl, new com.hotclick.security.ClientIpResolver("127.0.0.1/32")).doFilter(req, res, new MockFilterChain());
        assertThat(res.getStatus()).isEqualTo(429);
        verify(rl).tryAcquire("ip:203.0.113.9:altas-dia", 20, 86_400);
    }

    @Test
    @DisplayName("IP real: X-Forwarded-For falso desde un cliente que no es el proxy se ignora")
    void xffFalsoIgnorado() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/register");
        req.setRemoteAddr("198.51.100.7");
        req.addHeader("X-Forwarded-For", "1.2.3.4");
        req.addHeader("X-Real-IP", "1.2.3.4");
        filtro(rl, new com.hotclick.security.ClientIpResolver("127.0.0.1/32")).doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        verify(rl).tryAcquire("ip:198.51.100.7:/api/auth/register", 5, 900);
        verify(rl, org.mockito.Mockito.never()).tryAcquire(org.mockito.ArgumentMatchers.contains("1.2.3.4"), anyInt(), anyInt());
    }

    @Test
    @DisplayName("IP real: detrás de nginx (127.0.0.1) dos clientes distintos cuentan por separado")
    void detrasDelProxyCuentaPorCliente() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        RateLimitingFilter f = filtro(rl, new com.hotclick.security.ClientIpResolver("127.0.0.1/32"));
        for (String cliente : new String[]{"203.0.113.10", "203.0.113.11"}) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/register");
            req.setRemoteAddr("127.0.0.1");
            req.addHeader("X-Forwarded-For", cliente);
            f.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }
        verify(rl).tryAcquire("ip:203.0.113.10:/api/auth/register", 5, 900);
        verify(rl).tryAcquire("ip:203.0.113.11:/api/auth/register", 5, 900);
    }
}
