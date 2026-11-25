package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-07: el enlace de compra del bot tiene tope GET por IP, con un solo bucket para todos los códigos. */
class RateLimitEnlaceCompraTest {

    private RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("1.2.3.4");
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private int llamar(RateLimitingFilter f, String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(new MockHttpServletRequest("GET", uri), res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void cambiarElCodigoNoAbreOtroCupo() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        RateLimitingFilter f = filtro(rl);
        assertThat(llamar(f, "/api/public/enlace/AAAAAAAAAAAAAAAAAAAAAAAA")).isEqualTo(200);
        assertThat(llamar(f, "/api/public/enlace/BBBBBBBBBBBBBBBBBBBBBBBB")).isEqualTo(200);
        verify(rl, times(2)).tryAcquire(eq("ip:1.2.3.4:GET:/api/public/enlace"), eq(20), eq(60));
    }

    @Test
    void agotadoElCupo_429() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:GET:/api/public/enlace"), anyInt(), anyInt())).thenReturn(false);
        assertThat(llamar(filtro(rl), "/api/public/enlace/AAAAAAAAAAAAAAAAAAAAAAAA")).isEqualTo(429);
    }
}
