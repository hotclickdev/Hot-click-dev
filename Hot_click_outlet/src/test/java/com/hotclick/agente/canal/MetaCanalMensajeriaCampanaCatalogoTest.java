package com.hotclick.agente.canal;

import com.hotclick.agente.canal.CanalMensajeria.ReferenciaCatalogo;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.exception.IntegracionExternaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Plantillas de marketing (AG-36) y tarjetas nativas de catálogo (AG-37) contra un Meta simulado. */
class MetaCanalMensajeriaCampanaCatalogoTest {

    private static final String WA = "https://graph.facebook.com/v23.0/PNID-1/messages";
    private static final String SOCIAL = "https://graph.facebook.com/v23.0/me/messages";

    private final CanalCuentaService cuentas = mock(CanalCuentaService.class);
    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.createServer(http);
    private final MetaCanalMensajeria canal = new MetaCanalMensajeria(cuentas, http);

    private CanalCuenta cuenta(Canal tipo, String token) {
        CanalCuenta c = new CanalCuenta();
        c.setId(1L);
        c.setTipo(tipo);
        c.setIdExterno("PNID-1");
        c.setEmpresaId(7L);
        c.setEstado(EstadoCanal.ACTIVA);
        when(cuentas.tokenDe(c)).thenReturn(token);
        return c;
    }

    private static TarjetaProducto tarjeta() {
        return new TarjetaProducto(42L, "Bolso", new BigDecimal("12500"), "https://img.test/b.jpg");
    }

    @Test
    @DisplayName("plantilla de marketing: type template, nombre, idioma y un parámetro por variable")
    void plantillaMarketing() {
        server.expect(requestTo(WA)).andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer tok-x"))
            .andExpect(jsonPath("$.type").value("template"))
            .andExpect(jsonPath("$.to").value("5068888"))
            .andExpect(jsonPath("$.template.name").value("oferta_dic"))
            .andExpect(jsonPath("$.template.language.code").value("es"))
            .andExpect(jsonPath("$.template.components[0].type").value("body"))
            .andExpect(jsonPath("$.template.components[0].parameters[0].text").value("Ana"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.M1\"}]}", MediaType.APPLICATION_JSON));

        assertThat(canal.enviarPlantillaMarketing(cuenta(Canal.WHATSAPP, "tok-x"), "5068888", "oferta_dic", "es",
            List.of("Ana"))).isEqualTo("wamid.M1");
        server.verify();
    }

    @Test
    @DisplayName("parámetros con saltos de línea o vacíos se sanean (Meta los rechaza)")
    void parametrosSaneados() {
        server.expect(requestTo(WA))
            .andExpect(jsonPath("$.template.components[0].parameters[0].text").value("Ana Mora"))
            .andExpect(jsonPath("$.template.components[0].parameters[1].text").value("-"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"w\"}]}", MediaType.APPLICATION_JSON));

        canal.enviarPlantillaMarketing(cuenta(Canal.WHATSAPP, "t"), "5068888", "oferta_dic", "es", List.of("Ana\nMora", "  "));
        server.verify();
    }

    @Test
    @DisplayName("sin token es simulado y no llama a Meta; fuera de WhatsApp no hay plantillas")
    void simuladoYSoloWhatsapp() {
        assertThat(canal.enviarPlantillaMarketing(cuenta(Canal.WHATSAPP, null), "5068888", "n", "es", List.of()))
            .isEqualTo("simulado");
        assertThatThrownBy(() -> canal.enviarPlantillaMarketing(cuenta(Canal.INSTAGRAM, "t"), "IG1", "n", "es", List.of()))
            .isInstanceOf(UnsupportedOperationException.class);
        server.verify();
    }

    @Test
    @DisplayName("Meta responde 4xx (plantilla no aprobada, etc.): MetaRechazoException con el código, sin el cuerpo")
    void metaRechazaConCodigo() {
        server.expect(requestTo(WA)).andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
            .body("{\"error\":{\"code\":132001,\"message\":\"Template does not exist TEXTO-SENSIBLE\"}}"));

        assertThatThrownBy(() -> canal.enviarPlantillaMarketing(cuenta(Canal.WHATSAPP, "t"), "5068888", "n", "es", List.of()))
            .isInstanceOfSatisfying(MetaRechazoException.class, e -> {
                assertThat(e.codigoMeta()).isEqualTo(132001);
                assertThat(e.getMessage()).doesNotContain("TEXTO-SENSIBLE");
            });
    }

    @Test
    @DisplayName("Meta responde 5xx o 429: IntegracionExternaException (cuenta para el circuit breaker)")
    void metaCaida() {
        server.expect(requestTo(WA)).andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        assertThatThrownBy(() -> canal.enviarPlantillaMarketing(cuenta(Canal.WHATSAPP, "t"), "5068888", "n", "es", List.of()))
            .isInstanceOf(IntegracionExternaException.class);

        MockRestServiceServer s2 = MockRestServiceServer.createServer(http);
        s2.expect(requestTo(WA)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        assertThatThrownBy(() -> canal.enviarPlantillaMarketing(cuenta(Canal.WHATSAPP, "t"), "5068888", "n", "es", List.of()))
            .isInstanceOfSatisfying(IntegracionExternaException.class,
                e -> assertThat(e.getTipo()).isEqualTo(IntegracionExternaException.Tipo.RATE_LIMIT));
    }

    // ── tarjetas nativas ────────────────────────────────────────────────────

    @Test
    @DisplayName("WhatsApp: mensaje product con catalog_id y product_retailer_id")
    void productoNativoWhatsapp() {
        server.expect(requestTo(WA))
            .andExpect(jsonPath("$.type").value("interactive"))
            .andExpect(jsonPath("$.interactive.type").value("product"))
            .andExpect(jsonPath("$.interactive.action.catalog_id").value("CAT1"))
            .andExpect(jsonPath("$.interactive.action.product_retailer_id").value("42"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.P\"}]}", MediaType.APPLICATION_JSON));

        assertThat(canal.enviarProductoCatalogo(cuenta(Canal.WHATSAPP, "t"), "5068888",
            new ReferenciaCatalogo("CAT1", "42", null), tarjeta())).isEqualTo("wamid.P");
        server.verify();
    }

    @Test
    @DisplayName("si Meta rechaza la tarjeta nativa se envía la tarjeta normal (enviarProducto)")
    void respaldoSiMetaRechazaLaNativa() {
        server.expect(requestTo(WA)).andExpect(jsonPath("$.interactive.type").value("product"))
            .andRespond(withStatus(HttpStatus.BAD_REQUEST));
        server.expect(requestTo(WA)).andExpect(jsonPath("$.interactive.type").value("button"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.R\"}]}", MediaType.APPLICATION_JSON));

        assertThat(canal.enviarProductoCatalogo(cuenta(Canal.WHATSAPP, "t"), "5068888",
            new ReferenciaCatalogo("CAT1", "42", null), tarjeta())).isEqualTo("wamid.R");
        server.verify();
    }

    @Test
    @DisplayName("referencia incompleta: va directo a la tarjeta normal, sin intentar la nativa")
    void sinReferenciaUsaTarjetaNormal() {
        server.expect(requestTo(WA)).andExpect(jsonPath("$.interactive.type").value("button"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.N\"}]}", MediaType.APPLICATION_JSON));

        canal.enviarProductoCatalogo(cuenta(Canal.WHATSAPP, "t"), "5068888", null, tarjeta());
        server.verify();
    }

    @Test
    @DisplayName("Instagram: plantilla product con el id del producto en Meta; sin ese id usa la tarjeta normal")
    void productoNativoInstagram() {
        server.expect(requestTo(SOCIAL))
            .andExpect(jsonPath("$.message.attachment.payload.template_type").value("product"))
            .andExpect(jsonPath("$.message.attachment.payload.elements[0].id").value("FB-999"))
            .andRespond(withSuccess("{\"message_id\":\"mid.1\"}", MediaType.APPLICATION_JSON));
        assertThat(canal.enviarProductoCatalogo(cuenta(Canal.INSTAGRAM, "t"), "IGSID",
            new ReferenciaCatalogo("CAT1", "42", "FB-999"), tarjeta())).isEqualTo("mid.1");

        MockRestServiceServer s2 = MockRestServiceServer.createServer(http);
        s2.expect(requestTo(SOCIAL)).andExpect(jsonPath("$.message.attachment.payload.template_type").value("generic"))
            .andRespond(withSuccess("{\"message_id\":\"mid.2\"}", MediaType.APPLICATION_JSON));
        canal.enviarProductoCatalogo(cuenta(Canal.INSTAGRAM, "t"), "IGSID", new ReferenciaCatalogo("CAT1", "42", null), tarjeta());
        s2.verify();
    }

    @Test
    @DisplayName("WhatsApp: product_list con encabezado de texto, catalog_id y los retailer ids")
    void listaDeProductos() {
        server.expect(requestTo(WA))
            .andExpect(jsonPath("$.interactive.type").value("product_list"))
            .andExpect(jsonPath("$.interactive.header.type").value("text"))
            .andExpect(jsonPath("$.interactive.action.catalog_id").value("CAT1"))
            .andExpect(jsonPath("$.interactive.action.sections[0].product_items[0].product_retailer_id").value("42"))
            .andExpect(jsonPath("$.interactive.action.sections[0].product_items[1].product_retailer_id").value("43"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.L\"}]}", MediaType.APPLICATION_JSON));

        assertThat(canal.enviarListaProductosCatalogo(cuenta(Canal.WHATSAPP, "t"), "5068888", "CAT1", "Productos",
            "Opciones para vos", List.of("42", "43"), List.of(tarjeta()))).isEqualTo("wamid.L");
        server.verify();
    }
}
