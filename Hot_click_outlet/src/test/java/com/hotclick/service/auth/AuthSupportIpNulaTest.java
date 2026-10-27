package com.hotclick.service.auth;

import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** LOW (limitador): {@code AuthSupport.ipCliente} con IP nula daba la llave "ip:null"; ahora usa IpParaLlave.clave. */
@DisplayName("[Auth] AuthSupport.ipCliente: IP nula y IPv6")
class AuthSupportIpNulaTest {

    private final ClientIpResolver resolver = mock(ClientIpResolver.class);
    private final RateLimiter rateLimiter = mock(RateLimiter.class);

    private AuthSupport support() {
        AuthSupport s = new AuthSupport();
        ReflectionTestUtils.setField(s, "clientIpResolver", resolver);
        ReflectionTestUtils.setField(s, "rateLimiter", rateLimiter);
        return s;
    }

    @Test
    @DisplayName("Resolver sin IP: la llave es 'desconocida', nunca 'null'")
    void ipNulaNoDaNull() {
        when(resolver.resolve(org.mockito.ArgumentMatchers.any(HttpServletRequest.class))).thenReturn(null);
        assertThat(support().ipCliente(new MockHttpServletRequest())).isEqualTo("desconocida");
    }

    @Test
    @DisplayName("La llave del 2FA de login no lleva 'null' cuando no hay IP")
    void llave2faSinIp() {
        when(resolver.resolve(org.mockito.ArgumentMatchers.any(HttpServletRequest.class))).thenReturn(null);
        when(rateLimiter.tryAcquireEstricto(anyString(), anyInt(), anyInt())).thenReturn(true);
        support().limite2faLoginUsuario(7L, new MockHttpServletRequest());
        ArgumentCaptor<String> llave = ArgumentCaptor.forClass(String.class);
        verify(rateLimiter).tryAcquireEstricto(llave.capture(), anyInt(), anyInt());
        assertThat(llave.getValue()).doesNotContain("null").endsWith(":ip:desconocida");
    }

    @Test
    @DisplayName("IPv6: la IP del cliente sale como /64")
    void ipv6Slash64() {
        when(resolver.resolve(org.mockito.ArgumentMatchers.any(HttpServletRequest.class))).thenReturn("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
        assertThat(support().ipCliente(new MockHttpServletRequest())).isEqualTo("2001:0db8:0001:0002::/64");
    }
}
