package com.hotclick.agente.conexion;

import com.hotclick.exception.IntegracionExternaException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Contrato de Graph para el media de WhatsApp (AG-13): sin Meta real. */
class MetaGraphClienteMediaTest {

    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.createServer(http);
    private final MetaGraphCliente graph = new MetaGraphCliente(new MetaConexionConfig("a", "s", "x", "y", "v23.0"), http);

    @Test
    void devuelveUrlMimeYTamanoConElTokenDeLaCuenta() {
        server.expect(requestTo("https://graph.facebook.com/v23.0/9988")).andExpect(method(HttpMethod.GET))
            .andExpect(header("Authorization", "Bearer tok-x"))
            .andRespond(withSuccess("{\"url\":\"https://lookaside.fbsbx.com/a\",\"mime_type\":\"audio/ogg\",\"file_size\":321,\"id\":\"9988\"}",
                MediaType.APPLICATION_JSON));

        MetaGraphCliente.MediaWhatsapp m = graph.mediaWhatsapp("9988", "tok-x");

        assertThat(m.url()).isEqualTo("https://lookaside.fbsbx.com/a");
        assertThat(m.mime()).isEqualTo("audio/ogg");
        assertThat(m.tamano()).isEqualTo(321);
        assertThat(m.toString()).doesNotContain("fbsbx");
        server.verify();
    }

    @Test
    void rechazaIdsQueNoSonNumericosSinLlamarARed() {
        assertThatThrownBy(() -> graph.mediaWhatsapp("../me/accounts", "t")).isInstanceOf(IntegracionExternaException.class);
        assertThatThrownBy(() -> graph.mediaWhatsapp(null, "t")).isInstanceOf(IntegracionExternaException.class);
        server.verify();
    }

    @Test
    void sinUrlEsRespuestaInvalida() {
        server.expect(requestTo("https://graph.facebook.com/v23.0/1")).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> graph.mediaWhatsapp("1", "t")).isInstanceOf(IntegracionExternaException.class);
    }
}
