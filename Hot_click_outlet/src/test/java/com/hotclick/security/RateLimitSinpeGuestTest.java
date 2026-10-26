package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** P-03 (C4): los endpoints SINPE de invitado tienen tope; cambiar el número de pedido no abre otro cupo. */
class RateLimitSinpeGuestTest {

    private RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn("1.2.3.4");
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private int post(RateLimitingFilter f, String uri) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", uri);
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void comprobanteInvitado_bucketPorPrefijo() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        RateLimitingFilter f = filtro(rl);
        post(f, "/api/sinpe/guest/ORD-1/comprobante");
        post(f, "/api/sinpe/guest/ORD-2/comprobante");
        verify(rl, times(2)).tryAcquire(eq("ip:1.2.3.4:/api/sinpe/guest/"), anyInt(), anyInt());
    }

    @Test
    void guestCheckoutSinpe_limitadoY429AlAgotar() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:/api/sinpe/guest-checkout"), anyInt(), anyInt())).thenReturn(false);
        assertThat(post(filtro(rl), "/api/sinpe/guest-checkout")).isEqualTo(429);
    }
}
