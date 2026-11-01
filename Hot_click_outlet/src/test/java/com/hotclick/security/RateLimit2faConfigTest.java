package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 2FA: /2fa/setup, /2fa/activate y /2fa/disable tienen tope por IP, configurable por properties. */
class RateLimit2faConfigTest {

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
    void valoresPorDefecto() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        RateLimitingFilter f = filtro(rl);
        post(f, "/api/auth/2fa/setup");
        post(f, "/api/auth/2fa/activate");
        post(f, "/api/auth/2fa/disable");
        verify(rl).tryAcquire("ip:1.2.3.4:/api/auth/2fa/setup", 5, 300);
        verify(rl).tryAcquire("ip:1.2.3.4:/api/auth/2fa/activate", 10, 300);
        verify(rl).tryAcquire("ip:1.2.3.4:/api/auth/2fa/disable", 5, 300);
    }

    @Test
    void valoresConfigurables() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        RateLimitingFilter f = filtro(rl);
        ReflectionTestUtils.setField(f, "tfaSetupMax", 2);
        ReflectionTestUtils.setField(f, "tfaSetupWindow", 60);
        ReflectionTestUtils.setField(f, "tfaDisableMax", 3);
        ReflectionTestUtils.setField(f, "tfaDisableWindow", 120);
        post(f, "/api/auth/2fa/setup");
        post(f, "/api/auth/2fa/disable");
        verify(rl).tryAcquire("ip:1.2.3.4:/api/auth/2fa/setup", 2, 60);
        verify(rl).tryAcquire("ip:1.2.3.4:/api/auth/2fa/disable", 3, 120);
    }

    @Test
    void alAgotarElCupoResponde429EnLasTresRutas() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(false);
        RateLimitingFilter f = filtro(rl);
        assertThat(post(f, "/api/auth/2fa/setup")).isEqualTo(429);
        assertThat(post(f, "/api/auth/2fa/activate")).isEqualTo(429);
        assertThat(post(f, "/api/auth/2fa/disable")).isEqualTo(429);
    }
}
