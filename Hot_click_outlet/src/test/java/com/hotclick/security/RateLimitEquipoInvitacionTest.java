package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Invitar al equipo (envía correo) y consultar/aceptar una invitación (token en el body) tienen tope por IP.
 * El token no está en el path: el bucket es por IP + ruta/prefijo y no cambia con el body.
 */
class RateLimitEquipoInvitacionTest {

    private static final String CUERPO_429 =
        "{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}";

    private RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("1.2.3.4");
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private MockHttpServletResponse llamar(RateLimitingFilter f, String metodo, String uri) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(metodo, uri);
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(req, res, new MockFilterChain());
        return res;
    }

    private RateLimiter permisivo() {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        return rl;
    }

    @Test
    void invitarAplica5Por60sPorIp() throws Exception {
        RateLimiter rl = permisivo();
        assertThat(llamar(filtro(rl), "POST", "/api/empresa/equipo").getStatus()).isEqualTo(200);
        verify(rl).tryAcquire("ip:1.2.3.4:/api/empresa/equipo", 5, 60);
    }

    @Test
    void invitarAgotadoDa429ConElCuerpoDeSiempre() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:/api/empresa/equipo"), anyInt(), anyInt())).thenReturn(false);
        MockHttpServletResponse res = llamar(filtro(rl), "POST", "/api/empresa/equipo");
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).isEqualTo(CUERPO_429);
    }

    @Test
    void consultarYAceptarCuentaNuevaComparteUnBucketPorPrefijo() throws Exception {
        RateLimiter rl = permisivo();
        RateLimitingFilter f = filtro(rl);
        llamar(f, "POST", "/api/auth/equipo-invitacion/consultar");
        llamar(f, "POST", "/api/auth/equipo-invitacion/aceptar-cuenta-nueva");
        verify(rl, times(2)).tryAcquire("ip:1.2.3.4:/api/auth/equipo-invitacion/", 10, 60);
    }

    @Test
    void aceptarConSesionTieneSuBucketPorPrefijo() throws Exception {
        RateLimiter rl = permisivo();
        llamar(filtro(rl), "POST", "/api/equipo-invitaciones/aceptar");
        verify(rl).tryAcquire("ip:1.2.3.4:/api/equipo-invitaciones/", 10, 60);
    }

    @Test
    void agotadoDa429ConElMismoCuerpoYNoLlegaAlControlador() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(false);
        for (String uri : new String[] {"/api/auth/equipo-invitacion/consultar",
                "/api/auth/equipo-invitacion/aceptar-cuenta-nueva", "/api/equipo-invitaciones/aceptar"}) {
            MockHttpServletResponse res = llamar(filtro(rl), "POST", uri);
            assertThat(res.getStatus()).as(uri).isEqualTo(429);
            assertThat(res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).isEqualTo(CUERPO_429);
        }
    }

    @Test
    void getTambienTieneTope() throws Exception {
        RateLimiter rl = permisivo();
        RateLimitingFilter f = filtro(rl);
        llamar(f, "GET", "/api/auth/equipo-invitacion/consultar");
        llamar(f, "GET", "/api/equipo-invitaciones/aceptar");
        verify(rl).tryAcquire("ip:1.2.3.4:GET:/api/auth/equipo-invitacion", 20, 60);
        verify(rl).tryAcquire("ip:1.2.3.4:GET:/api/equipo-invitaciones", 20, 60);
    }
}
