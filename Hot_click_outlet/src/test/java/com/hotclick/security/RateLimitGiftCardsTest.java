package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Gift cards: validar tiene tope por IP (segunda capa) y el checkout que usa validarPublico sigue limitado. */
class RateLimitGiftCardsTest {

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
    void validarGiftCard_limitadoPorIpY429AlAgotar() throws Exception {
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(eq("ip:1.2.3.4:GET:/api/gift-cards/validar"), anyInt(), anyInt())).thenReturn(false);
        assertThat(llamar(filtro(rl), "GET", "/api/gift-cards/validar")).isEqualTo(429);
    }

    @Test
    void checkoutConGiftCard_siguePorIpLimitadoEnLosTresCheckouts() throws Exception {
        for (String ruta : new String[]{"/api/payments/checkout", "/api/payments/guest-checkout", "/api/sinpe/guest-checkout"}) {
            RateLimiter rl = mock(RateLimiter.class);
            when(rl.tryAcquire(eq("ip:1.2.3.4:" + ruta), eq(3), eq(60))).thenReturn(false);
            assertThat(llamar(filtro(rl), "POST", ruta)).as(ruta).isEqualTo(429);
        }
    }
}
