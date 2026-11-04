package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** BAJO: /api/marketplace/buscar y /api/marketplace/productos/* tienen tope GET por IP. */
class RateLimitMarketplacePublicoTest {

    private RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("1.2.3.4");
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private int llamar(RateLimitingFilter f, String metodo, String uri) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(metodo, uri);
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void buscar_429AlAgotarCupo() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:GET:/api/marketplace/buscar"), eq(60), eq(60))).thenReturn(false);
        assertThat(llamar(filtro(rl), "GET", "/api/marketplace/buscar")).isEqualTo(429);
        assertThat(llamar(filtro(rl), "HEAD", "/api/marketplace/buscar")).isEqualTo(429);
    }

    @Test
    void detalle_comparteBucketPorPrefijoSinImportarElId() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        RateLimitingFilter f = filtro(rl);
        assertThat(llamar(f, "GET", "/api/marketplace/productos/1")).isEqualTo(200);
        assertThat(llamar(f, "GET", "/api/marketplace/productos/2")).isEqualTo(200);
        verify(rl, times(2)).tryAcquire(eq("ip:1.2.3.4:GET:/api/marketplace/productos"), eq(120), eq(60));
    }

    @Test
    void detalle_429AlAgotarCupo() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:GET:/api/marketplace/productos"), anyInt(), anyInt())).thenReturn(false);
        assertThat(llamar(filtro(rl), "GET", "/api/marketplace/productos/42")).isEqualTo(429);
    }
}
