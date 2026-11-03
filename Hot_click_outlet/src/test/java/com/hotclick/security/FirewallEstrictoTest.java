package com.hotclick.security;

import com.hotclick.integration.BaseIntegrationTest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.security.web.firewall.RequestRejectedException;
import org.springframework.security.web.firewall.StrictHttpFirewall;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Seguridad #475: el firewall de Spring Security es StrictHttpFirewall y rechaza %2e, ; y // antes de los interceptores. */
class FirewallEstrictoTest extends BaseIntegrationTest {

    @Autowired private FilterChainProxy filterChainProxy;

    private HttpFirewall firewall() {
        return (HttpFirewall) ReflectionTestUtils.getField(filterChainProxy, "firewall");
    }

    @Test
    void esStrictHttpFirewall() {
        assertThat(firewall()).isInstanceOf(StrictHttpFirewall.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/pos/%2e%2e/pedidos", "/api/pos/%2E/venta", "/api/pos;jsessionid=X/historial",
        "/api/productos;x=1", "/api//productos", "//api/bodegas"})
    void rechazaRutasNoNormalizadas(String uri) {
        MockHttpServletRequest r = new MockHttpServletRequest("GET", uri);
        r.setServletPath(uri);
        assertThatThrownBy(() -> firewall().getFirewalledRequest(r)).as(uri).isInstanceOf(RequestRejectedException.class);
    }

    @Test
    void aceptaRutaNormal() {
        MockHttpServletRequest r = new MockHttpServletRequest("GET", "/api/pos/historial");
        r.setServletPath("/api/pos/historial");
        assertThat(firewall().getFirewalledRequest(r)).isNotNull();
    }
}
