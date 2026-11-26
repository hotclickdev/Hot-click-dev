package com.hotclick.agente.canal;

import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MensajesInteractivosTest {

    private static final String WA_URL = "https://graph.facebook.com/v23.0/PNID-1/messages";
    private static final String ME_URL = "https://graph.facebook.com/v23.0/me/messages";

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

    private static TarjetaProducto producto() {
        return new TarjetaProducto(123L, "Camiseta HotClick", new BigDecimal("12500"),
            "https://cdn.ejemplo.test/foto.jpg");
    }

    @Test
    void precioEnColonesFormatoCostaRica() {
        assertThat(MensajesInteractivos.precioColones(new BigDecimal("12500"))).isEqualTo("₡12.500");
        assertThat(MensajesInteractivos.precioColones(new BigDecimal("1234567.6"))).isEqualTo("₡1.234.568");
        assertThat(MensajesInteractivos.precioColones(new BigDecimal("900"))).isEqualTo("₡900");
    }

    @Test
    void whatsappProductoLlevaImagenPrecioYTresBotonesEstandar() {
        server.expect(requestTo(WA_URL)).andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.type").value("interactive"))
            .andExpect(jsonPath("$.interactive.type").value("button"))
            .andExpect(jsonPath("$.interactive.header.type").value("image"))
            .andExpect(jsonPath("$.interactive.header.image.link").value("https://cdn.ejemplo.test/foto.jpg"))
            .andExpect(jsonPath("$.interactive.body.text").value("Camiseta HotClick\n₡12.500"))
            .andExpect(jsonPath("$.interactive.action.buttons.length()").value(3))
            .andExpect(jsonPath("$.interactive.action.buttons[0].reply.id").value("comprar:123"))
            .andExpect(jsonPath("$.interactive.action.buttons[0].reply.title").value("Comprar"))
            .andExpect(jsonPath("$.interactive.action.buttons[1].reply.id").value("ver:123"))
            .andExpect(jsonPath("$.interactive.action.buttons[2].reply.id").value("persona"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.P\"}]}", MediaType.APPLICATION_JSON));
        assertThat(canal.enviarProducto(cuenta(Canal.WHATSAPP, "tk-a"), "WAID-1", producto())).isEqualTo("wamid.P");
        server.verify();
    }

    @Test
    void whatsappProductoSinImagenHttpsOmiteEncabezado() {
        var t = new TarjetaProducto(5L, "Gorra", new BigDecimal("5000"), "http://inseguro.test/x.jpg");
        var body = MensajesInteractivos.waProducto("WAID-1", t);
        @SuppressWarnings("unchecked")
        var inter = (java.util.Map<String, Object>) body.get("interactive");
        assertThat(inter).doesNotContainKey("header");
    }

    @Test
    void whatsappImagenConCaptionRecortadoA1024() {
        var t = new TarjetaProducto(5L, "X".repeat(2000), new BigDecimal("5000"), "https://cdn.ejemplo.test/a.jpg");
        var body = MensajesInteractivos.waImagen("WAID-1", t);
        @SuppressWarnings("unchecked")
        var img = (java.util.Map<String, Object>) body.get("image");
        assertThat(body.get("type")).isEqualTo("image");
        assertThat(((String) img.get("caption")).length()).isEqualTo(MensajesInteractivos.WA_MAX_CAPTION);
    }

    @Test
    void whatsappBotonesMaximoTresTitulosVeinteIdsDosCincoSeis() {
        List<Boton> botones = List.of(
            new Boton("a".repeat(300), "T".repeat(40)), new Boton("b", "B"), new Boton("c", "C"), new Boton("d", "D"));
        server.expect(requestTo(WA_URL))
            .andExpect(jsonPath("$.interactive.action.buttons.length()").value(3))
            .andExpect(jsonPath("$.interactive.action.buttons[0].reply.id").value("a".repeat(256)))
            .andExpect(jsonPath("$.interactive.action.buttons[0].reply.title").value("T".repeat(19) + "…"))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        canal.enviarBotones(cuenta(Canal.WHATSAPP, "tk-a"), "WAID-1", "¿Qué hacemos?", botones);
        server.verify();
    }

    @Test
    void whatsappListaMaximoDiezFilas() {
        List<FilaLista> filas = new ArrayList<>();
        for (int i = 0; i < 15; i++) filas.add(new FilaLista("ver:" + i, "Producto " + i, "₡1.000"));
        server.expect(requestTo(WA_URL))
            .andExpect(jsonPath("$.interactive.type").value("list"))
            .andExpect(jsonPath("$.interactive.action.button").value("Ver opciones"))
            .andExpect(jsonPath("$.interactive.action.sections[0].rows.length()").value(10))
            .andExpect(jsonPath("$.interactive.action.sections[0].rows[0].id").value("ver:0"))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        canal.enviarLista(cuenta(Canal.WHATSAPP, "tk-a"), "WAID-1", "Catálogo", null, filas);
        server.verify();
    }

    @Test
    void messengerProductoUsaGenericTemplateConPostback() {
        server.expect(requestTo(ME_URL))
            .andExpect(jsonPath("$.recipient.id").value("PSID-1"))
            .andExpect(jsonPath("$.message.attachment.type").value("template"))
            .andExpect(jsonPath("$.message.attachment.payload.template_type").value("generic"))
            .andExpect(jsonPath("$.message.attachment.payload.elements[0].title").value("Camiseta HotClick"))
            .andExpect(jsonPath("$.message.attachment.payload.elements[0].subtitle").value("₡12.500"))
            .andExpect(jsonPath("$.message.attachment.payload.elements[0].image_url").value("https://cdn.ejemplo.test/foto.jpg"))
            .andExpect(jsonPath("$.message.attachment.payload.elements[0].buttons.length()").value(3))
            .andExpect(jsonPath("$.message.attachment.payload.elements[0].buttons[0].type").value("postback"))
            .andExpect(jsonPath("$.message.attachment.payload.elements[0].buttons[0].payload").value("comprar:123"))
            .andRespond(withSuccess("{\"message_id\":\"m.1\"}", MediaType.APPLICATION_JSON));
        assertThat(canal.enviarProducto(cuenta(Canal.MESSENGER, "tk-b"), "PSID-1", producto())).isEqualTo("m.1");
        server.verify();
    }

    @Test
    void instagramBotonesUsaQuickRepliesConTituloMax20() {
        server.expect(requestTo(ME_URL))
            .andExpect(jsonPath("$.message.text").value("Elige"))
            .andExpect(jsonPath("$.message.quick_replies.length()").value(2))
            .andExpect(jsonPath("$.message.quick_replies[0].content_type").value("text"))
            .andExpect(jsonPath("$.message.quick_replies[0].title").value("Comprar"))
            .andExpect(jsonPath("$.message.quick_replies[0].payload").value("comprar:9"))
            .andExpect(jsonPath("$.message.quick_replies[1].title").value("Hablar con persona"))
            .andRespond(withSuccess("{\"message_id\":\"m.2\"}", MediaType.APPLICATION_JSON));
        canal.enviarBotones(cuenta(Canal.INSTAGRAM, "tk-c"), "IGSID-1", "Elige",
            List.of(Boton.comprar(9L), Boton.hablarConPersona()));
        server.verify();
    }

    @Test
    void listaEnInstagramCaeATextoNumerado() {
        server.expect(requestTo(ME_URL))
            .andExpect(jsonPath("$.message.text").value("Catálogo\n\nResponde con el número:\n1. Gorra - ₡5.000\n2. Taza"))
            .andRespond(withSuccess("{\"message_id\":\"m.3\"}", MediaType.APPLICATION_JSON));
        canal.enviarLista(cuenta(Canal.INSTAGRAM, "tk-c"), "IGSID-1", "Catálogo", "Ver",
            List.of(new FilaLista("ver:1", "Gorra", "₡5.000"), new FilaLista("ver:2", "Taza")));
        server.verify();
    }

    @Test
    void siMetaRechazaElInteractivoSeReenviaComoTextoNumerado() {
        server.expect(requestTo(WA_URL)).andExpect(jsonPath("$.type").value("interactive"))
            .andRespond(withBadRequest());
        server.expect(requestTo(WA_URL)).andExpect(jsonPath("$.type").value("text"))
            .andExpect(jsonPath("$.text.body").value(
                "Camiseta HotClick\n₡12.500\nFoto: https://cdn.ejemplo.test/foto.jpg\n\nResponde con el número:\n"
                    + "1. Comprar\n2. Ver más\n3. Hablar con persona"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.T\"}]}", MediaType.APPLICATION_JSON));
        assertThat(canal.enviarProducto(cuenta(Canal.WHATSAPP, "tk-a"), "WAID-1", producto())).isEqualTo("wamid.T");
        server.verify();
    }

    @Test
    void respaldoPorDefectoDeLaInterfazUsaEnviarTexto() {
        List<String> enviados = new ArrayList<>();
        CanalMensajeria soloTexto = (c, d, t) -> { enviados.add(t); return "ok"; };
        soloTexto.enviarProducto(null, "d", producto());
        soloTexto.enviarBotones(null, "d", "Hola", List.of(Boton.hablarConPersona()));
        assertThat(enviados).hasSize(2);
        assertThat(enviados.get(0)).contains("₡12.500").contains("1. Comprar");
        assertThat(enviados.get(1)).isEqualTo("Hola\n\nResponde con el número:\n1. Hablar con persona");
    }

    @Test
    void sinTokenModoSimuladoNoLlamaAMeta() {
        assertThat(canal.enviarProducto(cuenta(Canal.WHATSAPP, null), "WAID-1", producto())).isEqualTo("simulado");
        assertThat(canal.enviarBotones(cuenta(Canal.MESSENGER, ""), "P", "t", List.of(Boton.comprar(1L))))
            .isEqualTo("simulado");
        server.verify();
    }

    @Test
    void cuentaInactivaYBotonesVaciosFallan() {
        CanalCuenta c = cuenta(Canal.WHATSAPP, "tk-a");
        c.setEstado(EstadoCanal.PAUSADA);
        assertThatThrownBy(() -> canal.enviarProducto(c, "W", producto())).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> canal.enviarBotones(cuenta(Canal.WHATSAPP, "tk-a"), "W", "t", List.of()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void respuestaBotonInterpretaIds() {
        assertThat(RespuestaBoton.parsear("comprar:123")).contains(new RespuestaBoton(RespuestaBoton.Tipo.COMPRAR, 123L));
        assertThat(RespuestaBoton.parsear(" ver:7 ")).contains(new RespuestaBoton(RespuestaBoton.Tipo.VER_MAS, 7L));
        assertThat(RespuestaBoton.parsear("persona"))
            .contains(new RespuestaBoton(RespuestaBoton.Tipo.HABLAR_CON_PERSONA, null));
        assertThat(RespuestaBoton.parsear("hola quiero comprar")).isEmpty();
        assertThat(RespuestaBoton.parsear("comprar:abc")).isEmpty();
        assertThat(RespuestaBoton.parsear("comprar:")).isEmpty();
        assertThat(RespuestaBoton.parsear("otro:1")).isEmpty();
        assertThat(RespuestaBoton.parsear(null)).isEmpty();
    }
}
