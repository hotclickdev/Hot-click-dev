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
    @DisplayName("correo duplicado y cédula duplicada dan la misma excepción y el mismo mensaje genérico")
    void mismoMensajeParaCorreoYCedula() {
        when(usuarioRepository.existsByCorreoAndEstadoNot(eq("ya@test.cr"), anyInt())).thenReturn(true);
        Throwable porCorreo = catchThrowable(() -> usuarioService.registrarPendiente(alta("ya@test.cr", null)));

        when(usuarioRepository.existsByCorreoAndEstadoNot(eq("nuevo@test.cr"), anyInt())).thenReturn(false);
        when(usuarioRepository.existsByIdentificacionAndEstadoNot(eq("101110111"), anyInt())).thenReturn(true);
        Throwable porCedula = catchThrowable(() -> usuarioService.registrarPendiente(alta("nuevo@test.cr", "101110111")));

        assertThat(porCorreo).isExactlyInstanceOf(RegistroDuplicadoException.class);
        assertThat(porCedula).isExactlyInstanceOf(RegistroDuplicadoException.class);
        assertThat(porCorreo.getMessage()).isEqualTo(porCedula.getMessage()).isEqualTo(RegistroDuplicadoException.MENSAJE);
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
    @DisplayName("send-verification: los dos duplicados responden 400 con el mismo cuerpo")
    void handlerMismoStatusYCuerpo() throws Exception {
        AuthVerificationHandler handler = new AuthVerificationHandler();
        EmailVerificationService ev = mock(EmailVerificationService.class);
        TurnstileService ts = mock(TurnstileService.class);
        when(ts.verify(any(), any())).thenReturn(true);
        ReflectionTestUtils.setField(handler, "emailVerificationService", ev);
        ReflectionTestUtils.setField(handler, "turnstileService", ts);
        ReflectionTestUtils.setField(handler, "securityAuditService", mock(SecurityAuditService.class));
        doThrow(new RegistroDuplicadoException()).when(ev).iniciarRegistro(any());

        var r1 = handler.sendVerification(alta("ya@test.cr", null), null, new MockHttpServletRequest());
        var r2 = handler.sendVerification(alta("nuevo@test.cr", "101110111"), null, new MockHttpServletRequest());
        assertThat(r1.getStatusCode().value()).isEqualTo(400).isEqualTo(r2.getStatusCode().value());
        assertThat(r1.getBody().getMessage()).isEqualTo(r2.getBody().getMessage()).isEqualTo(RegistroDuplicadoException.MENSAJE);
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
        doThrow(new RegistroDuplicadoException()).when(ev).iniciarRegistro(any());

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
    @DisplayName("EmailVerificationService: correo ACTIVO da el mismo error genérico")
    void correoActivoGenerico() {
        UsuarioService us = mock(UsuarioService.class);
        Usuario activo = alta("ya@test.cr", null);
        activo.setEstado(Constants.ESTADO_ACTIVO);
        when(us.buscarPorCorreo("ya@test.cr")).thenReturn(java.util.Optional.of(activo));
        EmailVerificationService ev = new EmailVerificationService();
        ReflectionTestUtils.setField(ev, "usuarioService", us);
        Throwable t = catchThrowable(() -> ev.iniciarRegistro(alta("ya@test.cr", null)));
        assertThat(t).isExactlyInstanceOf(RegistroDuplicadoException.class);
    }

    @Test
    @DisplayName("rate limit por IP en /api/auth/send-verification y /api/auth/register: 429 al agotar el cupo")
    void rateLimitPorIp() throws Exception {
        for (String ruta : new String[]{"/api/auth/send-verification", "/api/auth/register"}) {
            RateLimitingFilter filtro = new RateLimitingFilter();
            RateLimiter rl = mock(RateLimiter.class);
            com.hotclick.security.ClientIpResolver ip = mock(com.hotclick.security.ClientIpResolver.class);
            when(ip.resolve(any())).thenReturn("203.0.113.9");
            when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(false);
            ReflectionTestUtils.setField(filtro, "rateLimiter", rl);
            ReflectionTestUtils.setField(filtro, "clientIpResolver", ip);
            ReflectionTestUtils.setField(filtro, "auditService", mock(SecurityAuditService.class));

            MockHttpServletRequest req = new MockHttpServletRequest("POST", ruta);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filtro.doFilter(req, res, new MockFilterChain());
            assertThat(res.getStatus()).as(ruta).isEqualTo(429);
            verify(rl).tryAcquire(eq("ip:203.0.113.9:" + ruta), anyInt(), anyInt());
        }
    }
}
