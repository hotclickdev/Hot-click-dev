package com.hotclick.security;

import com.hotclick.service.SecurityAuditService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** H-07: topes SINPE invitado (guest-checkout y comprobante), con el limitador existente. */
@DisplayName("[H-07] Rate limit SINPE invitado")
class RateLimitSinpeTest {

    private RateLimitingFilter filter;
    private final Map<String, Integer> contadores = new HashMap<>();
    private int pasaron;

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter();
        RateLimiter limiter = mock(RateLimiter.class);
        when(limiter.tryAcquire(anyString(), anyInt(), anyInt())).thenAnswer(inv -> {
            String k = inv.getArgument(0);
            int max = inv.getArgument(1);
            return contadores.merge(k, 1, Integer::sum) <= max;
        });
        ClientIpResolver ips = mock(ClientIpResolver.class);
        when(ips.resolve(any())).thenAnswer(inv -> ((MockHttpServletRequest) inv.getArgument(0)).getRemoteAddr());
        ReflectionTestUtils.setField(filter, "rateLimiter", limiter);
        ReflectionTestUtils.setField(filter, "clientIpResolver", ips);
        ReflectionTestUtils.setField(filter, "auditService", mock(SecurityAuditService.class));
        pasaron = 0;
    }

    private int post(String path, String ip) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", path);
        req.setRemoteAddr(ip);
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = (rq, rs) -> pasaron++;
        filter.doFilter(req, res, chain);
        if (res.getStatus() == 429) {
            assertThat(res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8))
                .isEqualTo("{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}");
            assertThat(res.getContentType()).startsWith("application/json");
        }
        return res.getStatus();
    }

    @Test
    @DisplayName("guest-checkout: 3 pasan, el 4.º da 429; otra IP sigue OK")
    void guestCheckout() throws Exception {
        for (int i = 0; i < 3; i++) assertThat(post("/api/sinpe/guest-checkout", "203.0.113.50")).isEqualTo(200);
        assertThat(post("/api/sinpe/guest-checkout", "203.0.113.50")).isEqualTo(429);
        assertThat(post("/api/sinpe/guest-checkout", "203.0.113.51")).isEqualTo(200);
        assertThat(pasaron).isEqualTo(4);
    }

    @Test
    @DisplayName("comprobante: mismo pedido y misma IP -> 429 al 6.º (tope pedido+IP; el global va en el servicio)")
    void comprobantePorPedido() throws Exception {
        for (int i = 0; i < 5; i++) assertThat(post("/api/sinpe/guest/HC-1001/comprobante", "198.51.100.1")).isEqualTo(200);
        assertThat(post("/api/sinpe/guest/HC-1001/comprobante", "198.51.100.1")).isEqualTo(429);
        assertThat(post("/api/sinpe/guest/HC-1001/comprobante", "198.51.100.2")).isEqualTo(200);
        assertThat(post("/api/sinpe/guest/HC-1002/comprobante", "198.51.100.1")).isEqualTo(200);
    }

    @Test
    @DisplayName("comprobante: misma IP sobre pedidos distintos -> 429 al 11.º (tope por IP)")
    void comprobantePorIp() throws Exception {
        for (int i = 0; i < 10; i++) assertThat(post("/api/sinpe/guest/HC-20" + i + "/comprobante", "203.0.113.60")).isEqualTo(200);
        assertThat(post("/api/sinpe/guest/HC-2999/comprobante", "203.0.113.60")).isEqualTo(429);
    }

    @Test
    @DisplayName("topes configurables: con max=1 el 2.º ya da 429")
    void configurable() throws Exception {
        ReflectionTestUtils.setField(filter, "sinpeCheckoutMax", 1);
        assertThat(post("/api/sinpe/guest-checkout", "203.0.113.70")).isEqualTo(200);
        assertThat(post("/api/sinpe/guest-checkout", "203.0.113.70")).isEqualTo(429);
    }

    @Test
    @DisplayName("checkout SINPE autenticado y rutas no listadas no se tocan")
    void otrasRutas() throws Exception {
        for (int i = 0; i < 20; i++) assertThat(post("/api/sinpe/checkout", "203.0.113.80")).isEqualTo(200);
    }
}
