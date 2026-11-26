package com.hotclick.agente.canal;

import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MetaCanalMensajeriaTest {

    private final CanalCuentaService cuentas = mock(CanalCuentaService.class);
    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.createServer(http);
    private final MetaCanalMensajeria canal = new MetaCanalMensajeria(cuentas, http);

    private CanalCuenta cuenta(Canal tipo, EstadoCanal estado, String token) {
        CanalCuenta c = new CanalCuenta();
        c.setId(1L);
        c.setTipo(tipo);
        c.setIdExterno("PNID-1");
        c.setEmpresaId(7L);
        c.setEstado(estado);
        when(cuentas.tokenDe(c)).thenReturn(token);
        return c;
    }

    @Test
    void whatsappUsaPhoneNumberIdYTokenDeLaCuenta() {
        server.expect(requestTo("https://graph.facebook.com/v23.0/PNID-1/messages"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer TOK-1"))
            .andExpect(jsonPath("$.messaging_product").value("whatsapp"))
            .andExpect(jsonPath("$.to").value("WAID-1"))
            .andExpect(jsonPath("$.text.body").value("hola"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.X\"}]}", MediaType.APPLICATION_JSON));
        assertThat(canal.enviarTexto(cuenta(Canal.WHATSAPP, EstadoCanal.ACTIVA, "TOK-1"), "WAID-1", "hola"))
            .isEqualTo("wamid.X");
        server.verify();
    }

    @Test
    void instagramYMessengerUsanSendApiMeMessages() {
        for (Canal tipo : new Canal[]{Canal.INSTAGRAM, Canal.MESSENGER}) {
            MockRestServiceServer s = MockRestServiceServer.createServer(http);
            s.expect(requestTo("https://graph.facebook.com/v23.0/me/messages"))
                .andExpect(header("Authorization", "Bearer TOK-2"))
                .andExpect(jsonPath("$.recipient.id").value("PSID-1"))
                .andExpect(jsonPath("$.messaging_type").value("RESPONSE"))
                .andExpect(jsonPath("$.message.text").value("hola"))
                .andRespond(withSuccess("{\"recipient_id\":\"PSID-1\",\"message_id\":\"mid.9\"}", MediaType.APPLICATION_JSON));
            assertThat(canal.enviarTexto(cuenta(tipo, EstadoCanal.ACTIVA, "TOK-2"), "PSID-1", "hola")).isEqualTo("mid.9");
            s.verify();
        }
    }

    @Test
    void sinTokenEsSimuladoYNoLlamaAMeta() {
        // el servidor simulado no espera ninguna llamada: cualquiera fallaría
        assertThat(canal.enviarTexto(cuenta(Canal.WHATSAPP, EstadoCanal.ACTIVA, null), "WAID-1", "hola"))
            .isEqualTo("simulado");
        server.verify();
    }

    @Test
    void cuentaNoActivaNoEnvia() {
        assertThatThrownBy(() -> canal.enviarTexto(cuenta(Canal.WHATSAPP, EstadoCanal.PAUSADA, "T"), "WAID-1", "hola"))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> canal.enviarTexto(cuenta(Canal.WHATSAPP, EstadoCanal.DESCONECTADA, "T"), "WAID-1", "hola"))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void textoLargoSeRecortaAlMaximoDelCanal() {
        String largo = "x".repeat(2000);
        assertThat(MetaCanalMensajeria.recortar(largo, MetaCanalMensajeria.MAX_SOCIAL)).hasSize(1000).endsWith("…");
        assertThat(MetaCanalMensajeria.recortar("corto", 1000)).isEqualTo("corto");
    }

    @Test
    void laVersionDelGraphApiEsConfigurableYCaeAV23SiEsInvalida() {
        MetaCanalMensajeria v24 = new MetaCanalMensajeria(cuentas, http, "v24.0");
        server.expect(requestTo("https://graph.facebook.com/v24.0/PNID-1/messages"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.V\"}]}", MediaType.APPLICATION_JSON));
        assertThat(v24.enviarTexto(cuenta(Canal.WHATSAPP, EstadoCanal.ACTIVA, "tk-1"), "WAID-1", "hola")).isEqualTo("wamid.V");
        server.verify();

        assertThat(MetaCanalMensajeria.versionValida("")).isEqualTo("v23.0");
        assertThat(MetaCanalMensajeria.versionValida(null)).isEqualTo("v23.0");
        assertThat(MetaCanalMensajeria.versionValida("../evil")).isEqualTo("v23.0");
        assertThat(MetaCanalMensajeria.versionValida(" V22.0 ")).isEqualTo("v22.0");
    }

    @Test
    void enviarPlantillaPorWhatsappArmaElCuerpoDeTemplate() {
        server.expect(requestTo("https://graph.facebook.com/v23.0/PNID-1/messages"))
            .andExpect(jsonPath("$.type").value("template"))
            .andExpect(jsonPath("$.to").value("WAID-1"))
            .andExpect(jsonPath("$.template.name").value("hotclick_traspaso_asesor_v1"))
            .andExpect(jsonPath("$.template.components[0].parameters[0].text").value("Ana"))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.T\"}]}", MediaType.APPLICATION_JSON));
        assertThat(canal.enviarPlantilla(cuenta(Canal.WHATSAPP, EstadoCanal.ACTIVA, "tk-1"), "WAID-1",
            com.hotclick.service.whatsapp.PlantillaMeta.TRASPASO_ASESOR, java.util.List.of("Ana"))).isEqualTo("wamid.T");
        server.verify();
    }

    @Test
    void enviarPlantillaFueraDeWhatsappNoEstaSoportado() {
        assertThatThrownBy(() -> canal.enviarPlantilla(cuenta(Canal.INSTAGRAM, EstadoCanal.ACTIVA, "tk-1"), "IGSID-1",
            com.hotclick.service.whatsapp.PlantillaMeta.TRASPASO_ASESOR, java.util.List.of("Ana")))
            .isInstanceOf(UnsupportedOperationException.class);
    }
}
