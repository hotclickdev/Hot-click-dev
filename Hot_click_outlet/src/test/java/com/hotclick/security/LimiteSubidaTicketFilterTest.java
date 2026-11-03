package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/** BAJO 3: la foto del ticket se corta por Content-Length antes del multipart; otras subidas no cambian. */
class LimiteSubidaTicketFilterTest {

    private final LimiteSubidaTicketFilter filtro = new LimiteSubidaTicketFilter();

    private int estado(String metodo, String uri, long largo) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(metodo, uri);
        req.addHeader("Content-Length", String.valueOf(largo));
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filtro.doFilter(req, res, chain);
        return chain.getRequest() == null ? res.getStatus() : 0; // 0 = siguió la cadena
    }

    @Test
    void fotoDeTicketMayorA10MbSeCortaCon413() throws Exception {
        assertThat(estado("POST", "/api/soporte/tickets/fotos", 11L * 1024 * 1024)).isEqualTo(413);
        assertThat(estado("POST", "/api//soporte/tickets/fotos;x=1", 11L * 1024 * 1024)).isEqualTo(413);
    }

    @Test
    void fotoDeTicketDentroDelTopeSigue() throws Exception {
        assertThat(estado("POST", "/api/soporte/tickets/fotos", 5L * 1024 * 1024)).isZero();
        assertThat(estado("POST", "/api/soporte/tickets/fotos", LimiteSubidaTicketFilter.MAX_CUERPO)).isZero();
    }

    @Test
    void otrasSubidasConservanElTopeGlobal() throws Exception {
        assertThat(estado("POST", "/api/productos/imagen", 25L * 1024 * 1024)).isZero();
        assertThat(estado("POST", "/api/servicios/fotos", 25L * 1024 * 1024)).isZero();
        assertThat(estado("GET", "/api/soporte/tickets/fotos", 25L * 1024 * 1024)).isZero();
    }

    @Test
    void contentLengthInvalidoSeRechaza() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/soporte/tickets/fotos");
        req.addHeader("Content-Length", "abc");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filtro.doFilter(req, res, new MockFilterChain());
        assertThat(res.getStatus()).isEqualTo(413);
    }

    @Test
    void fotoDeTicketChunkedOSinContentLengthSeCortaCon413() throws Exception {
        MockHttpServletRequest chunked = new MockHttpServletRequest("POST", "/api/soporte/tickets/fotos");
        chunked.addHeader("Transfer-Encoding", "chunked");
        chunked.setContent(new byte[16]);
        MockHttpServletResponse r1 = new MockHttpServletResponse();
        MockFilterChain c1 = new MockFilterChain();
        filtro.doFilter(chunked, r1, c1);
        assertThat(c1.getRequest()).isNull();
        assertThat(r1.getStatus()).isEqualTo(413);

        MockHttpServletRequest sinLargo = new MockHttpServletRequest("POST", "/api/soporte/tickets/fotos");
        sinLargo.setProtocol("HTTP/2.0");
        MockHttpServletResponse r2 = new MockHttpServletResponse();
        MockFilterChain c2 = new MockFilterChain();
        filtro.doFilter(sinLargo, r2, c2);
        assertThat(c2.getRequest()).isNull();
        assertThat(r2.getStatus()).isEqualTo(413);

        // otras rutas chunked no cambian
        MockHttpServletRequest otra = new MockHttpServletRequest("POST", "/api/productos/imagen");
        otra.addHeader("Transfer-Encoding", "chunked");
        MockFilterChain c3 = new MockFilterChain();
        filtro.doFilter(otra, new MockHttpServletResponse(), c3);
        assertThat(c3.getRequest()).isNotNull();
    }
}
