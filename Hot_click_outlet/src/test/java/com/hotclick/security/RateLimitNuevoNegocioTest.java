package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Riesgo 15-nov: /api/auth/nuevo-negocio tiene rate limit propio, igual al de /api/auth/registro-empresa (5 / 60s por IP, 429). */
class RateLimitNuevoNegocioTest {

    private static final String RUTA = "/api/auth/nuevo-negocio";

    private RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("1.2.3.4");
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private MockHttpServletResponse post(RateLimitingFilter f, String uri) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", uri);
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(req, res, new MockFilterChain());
        return res;
    }

    @Test
    void aplicaTopeDe5Por60sPorIp() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        assertThat(post(filtro(rl), RUTA).getStatus()).isEqualTo(200);
        verify(rl).tryAcquire("ip:1.2.3.4:" + RUTA, 5, 60);
    }

    @Test
    void mismoTopeQueRegistroEmpresa() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        RateLimitingFilter f = filtro(rl);
        post(f, RUTA);
        post(f, "/api/auth/registro-empresa");
        verify(rl).tryAcquire("ip:1.2.3.4:" + RUTA, 5, 60);
        verify(rl).tryAcquire("ip:1.2.3.4:/api/auth/registro-empresa", 5, 60);
    }

    @Test
    void agotadoDevuelve429ConMismoCuerpo() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:" + RUTA), anyInt(), anyInt())).thenReturn(false);
        MockHttpServletResponse res = post(filtro(rl), RUTA);
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8))
            .isEqualTo("{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}");
    }
}
