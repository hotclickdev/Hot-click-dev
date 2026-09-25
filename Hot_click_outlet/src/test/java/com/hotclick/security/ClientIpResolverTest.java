package com.hotclick.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * ClientIpResolver: solo confía en X-Forwarded-For / X-Real-IP si el peer TCP
 * es un proxy de confianza. ForwardedHeaderFilter puede envolver el request y
 * pisar getRemoteAddr(); los tests construyen ambos: request de contenedor
 * (como tras desenrollar) y wrapper estilo FHF (como lo ve el filtro).
 */
@DisplayName("[SEC] ClientIpResolver — peer de confianza vs headers falsificados")
class ClientIpResolverTest {

    private ClientIpResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new ClientIpResolver(ClientIpResolver.PRIVATE_RANGES_ALIAS);
    }

    @Test
    @DisplayName("Peer no confiable: X-Forwarded-For falsificado no cambia la IP")
    void untrustedPeer_spoofedXForwardedFor_ignored() {
        MockHttpServletRequest request = containerRequest("203.0.113.50");
        request.addHeader(ClientIpResolver.HEADER_FORWARDED_FOR, "10.0.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.50");
    }

    @Test
    @DisplayName("Peer no confiable: X-Real-IP falsificado no cambia la IP")
    void untrustedPeer_spoofedXRealIp_ignored() {
        MockHttpServletRequest request = containerRequest("198.51.100.20");
        request.addHeader(ClientIpResolver.HEADER_REAL_IP, "127.0.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.20");
    }

    @Test
    @DisplayName("Peer confiable 127.0.0.1: honra X-Forwarded-For de derecha a izquierda")
    void trustedLoopback_honorsXForwardedForRightToLeft() {
        MockHttpServletRequest request = containerRequest("127.0.0.1");
        // Izquierda la inventó el cliente; 10.0.0.5 es el proxy; 203.0.113.10 es el peer
        // que vio el último proxy honesto → cliente real.
        request.addHeader(ClientIpResolver.HEADER_FORWARDED_FOR, "1.1.1.1, 203.0.113.10, 10.0.0.5");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.10");
    }

    @Test
    @DisplayName("Peer confiable 10.x: honra X-Forwarded-For de derecha a izquierda")
    void trustedPrivatePeer_honorsXForwardedForRightToLeft() {
        MockHttpServletRequest request = containerRequest("10.0.0.2");
        request.addHeader(ClientIpResolver.HEADER_FORWARDED_FOR, "198.51.100.9, 10.1.1.1");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.9");
    }

    @Test
    @DisplayName("Peer confiable sin XFF usable: cae a X-Real-IP")
    void trustedPeer_fallsBackToXRealIp() {
        MockHttpServletRequest request = containerRequest("127.0.0.1");
        request.addHeader(ClientIpResolver.HEADER_REAL_IP, "203.0.113.77");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.77");
    }

    @Test
    @DisplayName("Header X-Forwarded-For malformado no tira la request")
    void malformedXForwardedFor_doesNotThrow() {
        MockHttpServletRequest request = containerRequest("127.0.0.1");
        request.addHeader(ClientIpResolver.HEADER_FORWARDED_FOR, "not-an-ip, ;;; , spoofed-host");
        request.addHeader(ClientIpResolver.HEADER_REAL_IP, "also-not-valid");

        assertThatCode(() -> resolver.resolve(request)).doesNotThrowAnyException();
        assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
    }

    @Test
    @DisplayName("Wrapper estilo ForwardedHeaderFilter: desenrolla peer TCP y header original")
    void forwardedHeaderFilterWrapper_unwrapsPeerAndOriginalHeader() {
        // Contenedor: peer real = Nginx en loopback; XFF intacto.
        MockHttpServletRequest container = containerRequest("127.0.0.1");
        container.addHeader(ClientIpResolver.HEADER_FORWARDED_FOR, "203.0.113.40, 10.0.0.5");

        // Como lo ve el filtro tras ForwardedHeaderFilter: remoteAddr pisado, XFF borrado.
        HttpServletRequest asSeenByFilter = forwardedHeaderFilterLike(container, "203.0.113.40");

        assertThat(asSeenByFilter.getRemoteAddr()).isEqualTo("203.0.113.40");
        assertThat(asSeenByFilter.getHeader(ClientIpResolver.HEADER_FORWARDED_FOR)).isNull();

        assertThat(resolver.resolve(asSeenByFilter)).isEqualTo("203.0.113.40");
    }

    @Test
    @DisplayName("Wrapper FHF con peer no confiable: no cree el remoteAddr pisado")
    void forwardedHeaderFilterWrapper_untrustedPeer_ignoresSpoofedRemoteAddr() {
        MockHttpServletRequest container = containerRequest("203.0.113.50");
        container.addHeader(ClientIpResolver.HEADER_FORWARDED_FOR, "10.0.0.1");

        HttpServletRequest asSeenByFilter = forwardedHeaderFilterLike(container, "10.0.0.1");

        assertThat(resolver.resolve(asSeenByFilter)).isEqualTo("203.0.113.50");
    }

    /** Request tal cual lo entrega el contenedor (antes de ForwardedHeaderFilter). */
    private static MockHttpServletRequest containerRequest(String peerTcp) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(peerTcp);
        return request;
    }

    /**
     * Simula ForwardedHeaderExtractingRequest: pisa getRemoteAddr() con el valor
     * derivado de XFF y oculta X-Forwarded-For / X-Real-IP en el wrapper, dejando
     * peer y headers intactos en el request interno.
     */
    private static HttpServletRequest forwardedHeaderFilterLike(
            HttpServletRequest container, String spoofedRemoteAddr) {
        return new HttpServletRequestWrapper(container) {
            @Override
            public String getRemoteAddr() {
                return spoofedRemoteAddr;
            }

            @Override
            public String getHeader(String name) {
                if (ClientIpResolver.HEADER_FORWARDED_FOR.equalsIgnoreCase(name)
                        || ClientIpResolver.HEADER_REAL_IP.equalsIgnoreCase(name)) {
                    return null;
                }
                return super.getHeader(name);
            }
        };
    }
}
