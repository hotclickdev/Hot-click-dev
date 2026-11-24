package com.hotclick.agente.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MetaWebhookControllerTest {

    private static final String SECRETO = "secreto-app-prueba";
    private static final String TOKEN = "token-verificacion-prueba";
    private static final String EVENTO = """
        {"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{
          "metadata":{"phone_number_id":"PNID"},
          "messages":[{"from":"WAID","id":"wamid.1","timestamp":"1","type":"text","text":{"body":"hola"}}]}}]}]}
        """;

    private MetaEventoDedup dedup;
    private final List<MensajeEntrante> recibidos = new ArrayList<>();
    private MetaWebhookFirma firma;

    private MockMvc mvc(MetaWebhookFirma f, MensajeEntranteHandler... hs) {
        @SuppressWarnings("unchecked")
        ObjectProvider<MensajeEntranteHandler> provider = mock(ObjectProvider.class);
        when(provider.orderedStream()).thenAnswer(i -> Stream.of(hs));
        return MockMvcBuilders.standaloneSetup(
            new MetaWebhookController(f, new MetaWebhookParser(), dedup, provider, new ObjectMapper())).build();
    }

    private MockMvc mvc() {
        return mvc(firma, recibidos::add);
    }

    private String firmar(String cuerpo) {
        return MetaWebhookFirma.PREFIJO + HexFormat.of().formatHex(firma.calcular(cuerpo.getBytes(StandardCharsets.UTF_8)));
    }

    @BeforeEach
    void setUp() {
        dedup = mock(MetaEventoDedup.class);
        when(dedup.esNuevo(anyString(), any())).thenReturn(true);
        firma = new MetaWebhookFirma(SECRETO, TOKEN);
        recibidos.clear();
    }

    @Test
    void verificacionDeSuscripcionDevuelveElChallenge() throws Exception {
        mvc().perform(get("/api/webhooks/meta")
                .param("hub.mode", "subscribe").param("hub.verify_token", TOKEN).param("hub.challenge", "12345"))
            .andExpect(status().isOk())
            .andExpect(content().string("12345"));
    }

    @Test
    void verificacionConTokenIncorrectoOModoRaroEs403() throws Exception {
        mvc().perform(get("/api/webhooks/meta")
                .param("hub.mode", "subscribe").param("hub.verify_token", "malo").param("hub.challenge", "1"))
            .andExpect(status().isForbidden());
        mvc().perform(get("/api/webhooks/meta")
                .param("hub.mode", "unsubscribe").param("hub.verify_token", TOKEN).param("hub.challenge", "1"))
            .andExpect(status().isForbidden());
    }

    @Test
    void eventoFirmadoLlegaAlHandler() throws Exception {
        mvc().perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", firmar(EVENTO)).content(EVENTO))
            .andExpect(status().isOk());
        assertThat(recibidos).hasSize(1);
        assertThat(recibidos.get(0).mensajeId()).isEqualTo("wamid.1");
    }

    @Test
    void firmaInvalidaEs403YNoSeProcesa() throws Exception {
        mvc().perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", "sha256=" + "0".repeat(64)).content(EVENTO))
            .andExpect(status().isForbidden());
        mvc().perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON).content(EVENTO))
            .andExpect(status().isForbidden());
        assertThat(recibidos).isEmpty();
        verify(dedup, never()).esNuevo(anyString(), any());
    }

    @Test
    void reintentoDuplicadoNoLlegaDosVeces() throws Exception {
        when(dedup.esNuevo("wamid.1", MensajeEntrante.Canal.WHATSAPP)).thenReturn(true, false);
        MockMvc m = mvc();
        for (int i = 0; i < 2; i++) {
            m.perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                    .header("X-Hub-Signature-256", firmar(EVENTO)).content(EVENTO))
                .andExpect(status().isOk());
        }
        assertThat(recibidos).hasSize(1);
    }

    @Test
    void sinConfiguracionResponde503() throws Exception {
        MetaWebhookFirma vacia = new MetaWebhookFirma("", "");
        mvc(vacia, recibidos::add).perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", firmar(EVENTO)).content(EVENTO))
            .andExpect(status().isServiceUnavailable());
        assertThat(recibidos).isEmpty();
    }

    @Test
    void cuerpoMuyGrandeEs413() throws Exception {
        String grande = "{\"x\":\"" + "a".repeat(MetaWebhookController.MAX_BODY_BYTES) + "\"}";
        mvc().perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", firmar(grande)).content(grande))
            .andExpect(status().isPayloadTooLarge());
    }

    @Test
    void handlerQueFallaNoRompeLaRespuestaNiLosDemas() throws Exception {
        MensajeEntranteHandler roto = m -> { throw new IllegalStateException("boom"); };
        mvc(firma, roto, recibidos::add).perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", firmar(EVENTO)).content(EVENTO))
            .andExpect(status().isOk());
        assertThat(recibidos).hasSize(1);
    }

    @Test
    void jsonInvalidoConFirmaValidaEs400() throws Exception {
        String malo = "no es json";
        mvc().perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", firmar(malo)).content(malo))
            .andExpect(status().isBadRequest());
    }
}
