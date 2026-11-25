package com.hotclick.agente.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** El webhook entrega los acuses y los estados de plantilla a sus handlers, con firma y sin romper los mensajes. */
class MetaWebhookEstadosTest {

    private static final String EVENTO = """
        {"object":"whatsapp_business_account","entry":[{"changes":[
          {"field":"messages","value":{"metadata":{"phone_number_id":"PNID"},
            "statuses":[{"id":"wamid.A","status":"read","timestamp":"5"}],
            "messages":[{"from":"WAID","id":"wamid.1","timestamp":"1","type":"text","text":{"body":"hola"}}]}},
          {"field":"message_template_status_update","value":{"event":"REJECTED","message_template_id":"m-1","reason":"INVALID_FORMAT"}}]}]}
        """;

    private final MetaWebhookFirma firma = new MetaWebhookFirma("secreto-app-prueba", "verificacion-prueba");
    private final List<EstadoEntrante.EstadoMensaje> acuses = new ArrayList<>();
    private final List<EstadoEntrante.EstadoPlantilla> plantillas = new ArrayList<>();
    private final List<MensajeEntrante> mensajes = new ArrayList<>();

    @SuppressWarnings("unchecked")
    private MockMvc mvc(boolean handlerDeEstadosFalla) {
        MetaEventoDedup dedup = mock(MetaEventoDedup.class);
        when(dedup.esNuevo(anyString(), any())).thenReturn(true);
        ObjectProvider<MensajeEntranteHandler> hm = mock(ObjectProvider.class);
        MensajeEntranteHandler handlerMensajes = mensajes::add;
        when(hm.orderedStream()).thenAnswer(i -> Stream.of(handlerMensajes));
        ObjectProvider<EstadoEntranteHandler> he = mock(ObjectProvider.class);
        EstadoEntranteHandler roto = new EstadoEntranteHandler() {
            @Override public void estado(EstadoEntrante.EstadoMensaje e) { throw new IllegalStateException("falla"); }
            @Override public void plantilla(EstadoEntrante.EstadoPlantilla p) { throw new IllegalStateException("falla"); }
        };
        EstadoEntranteHandler bueno = new EstadoEntranteHandler() {
            @Override public void estado(EstadoEntrante.EstadoMensaje e) { acuses.add(e); }
            @Override public void plantilla(EstadoEntrante.EstadoPlantilla p) { plantillas.add(p); }
        };
        when(he.orderedStream()).thenAnswer(i -> handlerDeEstadosFalla ? Stream.of(roto, bueno) : Stream.of(bueno));
        return MockMvcBuilders.standaloneSetup(
            new MetaWebhookController(firma, new MetaWebhookParser(), dedup, hm, new ObjectMapper(), he, null)).build();
    }

    private String firmar(String cuerpo) {
        return MetaWebhookFirma.PREFIJO + HexFormat.of().formatHex(firma.calcular(cuerpo.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("evento firmado: llegan el mensaje, el acuse y el estado de la plantilla")
    void entregaTodo() throws Exception {
        mvc(false).perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
            .header("X-Hub-Signature-256", firmar(EVENTO)).content(EVENTO)).andExpect(status().isOk());

        assertThat(mensajes).hasSize(1);
        assertThat(acuses).extracting(EstadoEntrante.EstadoMensaje::estado).containsExactly("read");
        assertThat(plantillas).extracting(EstadoEntrante.EstadoPlantilla::evento).containsExactly("REJECTED");
    }

    @Test
    @DisplayName("un handler de estados que falla no impide a los demás ni cambia la respuesta 200")
    void handlerRotoNoAfecta() throws Exception {
        mvc(true).perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
            .header("X-Hub-Signature-256", firmar(EVENTO)).content(EVENTO)).andExpect(status().isOk());

        assertThat(acuses).hasSize(1);
        assertThat(plantillas).hasSize(1);
    }

    @Test
    @DisplayName("sin firma válida no se entrega ningún estado")
    void firmaInvalida() throws Exception {
        mvc(false).perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
            .header("X-Hub-Signature-256", "sha256=" + "0".repeat(64)).content(EVENTO)).andExpect(status().isForbidden());

        assertThat(acuses).isEmpty();
        assertThat(plantillas).isEmpty();
    }
}
