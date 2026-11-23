package com.hotclick.seo.indexnow;

import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@DisplayName("IndexNow: no-op sin clave; con clave de prueba avisa la URL canónica")
class IndexNowServiceTest {

    // Clave ficticia de prueba (no es un secreto real).
    private static final String CLAVE_TEST = "clave-de-prueba-1234";

    @Test
    void sinClaveNoLlamaALaRedNiFalla() {
        // Endpoint inalcanzable: si intentara conectar, fallaría o tardaría; el servicio no debe ni intentarlo.
        IndexNowService s = new IndexNowService("", "", "http://127.0.0.1:1/indexnow", "https://hotclick.lat");
        assertThat(s.activo()).isFalse();
        s.notificarProducto(1L);
        s.enviar(List.of("https://hotclick.lat/productos/1"));
    }

    @Test
    void claveInvalidaCuentaComoSinClave() {
        assertThat(new IndexNowService("corta", "", "http://x", "https://hotclick.lat").activo()).isFalse();
        assertThat(new IndexNowService("con espacios y ñ!!", "", "http://x", "https://hotclick.lat").activo()).isFalse();
        assertThat(new IndexNowService("", "/no/existe/indexnow.key", "http://x", "https://hotclick.lat").activo()).isFalse();
    }

    @Test
    void conClaveEnviaLaUrlCanonicaAlEndpoint() throws Exception {
        List<String> recibidos = new CopyOnWriteArrayList<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/indexnow", ex -> {
            recibidos.add(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            ex.sendResponseHeaders(200, -1);
            ex.close();
        });
        server.start();
        try {
            String endpoint = "http://127.0.0.1:" + server.getAddress().getPort() + "/indexnow";
            IndexNowService s = new IndexNowService(CLAVE_TEST, "", endpoint, "https://hotclick.lat/");
            s.enviar(List.of("https://hotclick.lat/productos/620"));

            assertThat(recibidos).hasSize(1);
            assertThat(recibidos.get(0))
                .contains("\"host\":\"hotclick.lat\"")
                .contains("\"key\":\"" + CLAVE_TEST + "\"")
                .contains("\"keyLocation\":\"https://hotclick.lat/" + CLAVE_TEST + ".txt\"")
                .contains("\"urlList\":[\"https://hotclick.lat/productos/620\"]");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void filtroSirveElTxtSoloConClaveYRutaExacta() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        IndexNowKeyFilter conClave = new IndexNowKeyFilter(new IndexNowService(CLAVE_TEST, "", "http://x", "https://hotclick.lat"));

        MockHttpServletResponse ok = new MockHttpServletResponse();
        conClave.doFilter(get("/" + CLAVE_TEST + ".txt"), ok, chain);
        assertThat(ok.getContentAsString()).isEqualTo(CLAVE_TEST);
        verifyNoInteractions(chain);

        MockHttpServletRequest otra = get("/otra-clave-1234.txt");
        conClave.doFilter(otra, new MockHttpServletResponse(), chain);
        verify(chain).doFilter(org.mockito.ArgumentMatchers.eq(otra), org.mockito.ArgumentMatchers.any());

        FilterChain chain2 = mock(FilterChain.class);
        IndexNowKeyFilter sinClave = new IndexNowKeyFilter(new IndexNowService("", "", "http://x", "https://hotclick.lat"));
        MockHttpServletRequest req = get("/" + CLAVE_TEST + ".txt");
        sinClave.doFilter(req, new MockHttpServletResponse(), chain2);
        verify(chain2).doFilter(org.mockito.ArgumentMatchers.eq(req), org.mockito.ArgumentMatchers.any());
    }

    private static MockHttpServletRequest get(String uri) {
        MockHttpServletRequest r = new MockHttpServletRequest("GET", uri);
        r.setRequestURI(uri);
        return r;
    }
}
