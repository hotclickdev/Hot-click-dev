package com.hotclick.agente.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MetaWebhookParserTest {

    private final ObjectMapper om = new ObjectMapper();
    private final MetaWebhookParser parser = new MetaWebhookParser();

    private List<MensajeEntrante> parsear(String json) throws Exception {
        return parser.parsear(om.readTree(json));
    }

    @Test
    void whatsappTextoConNombreDeContacto() throws Exception {
        List<MensajeEntrante> r = parsear("""
            {"object":"whatsapp_business_account","entry":[{"id":"WABA","changes":[{"field":"messages","value":{
              "messaging_product":"whatsapp","metadata":{"display_phone_number":"NUMERO-PRUEBA","phone_number_id":"PNID"},
              "contacts":[{"profile":{"name":"Ana"},"wa_id":"WAID-CLIENTE"}],
              "messages":[{"from":"WAID-CLIENTE","id":"wamid.AAA","timestamp":"1764000000","type":"text","text":{"body":"Hola, ¿tienen leche?"}}]}}]}]}
            """);
        assertThat(r).hasSize(1);
        MensajeEntrante m = r.get(0);
        assertThat(m.canal()).isEqualTo(Canal.WHATSAPP);
        assertThat(m.cuentaId()).isEqualTo("PNID");
        assertThat(m.remitenteId()).isEqualTo("WAID-CLIENTE");
        assertThat(m.nombre()).isEqualTo("Ana");
        assertThat(m.mensajeId()).isEqualTo("wamid.AAA");
        assertThat(m.tipo()).isEqualTo("text");
        assertThat(m.texto()).isEqualTo("Hola, ¿tienen leche?");
        assertThat(m.epochSeg()).isEqualTo(1764000000L);
    }

    @Test
    void whatsappBotonesYListasDanElTituloElegido() throws Exception {
        List<MensajeEntrante> r = parsear("""
            {"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{
              "metadata":{"phone_number_id":"PNID"},
              "messages":[
                {"from":"WAID","id":"w1","type":"interactive","interactive":{"type":"button_reply","button_reply":{"id":"comprar","title":"Comprar"}}},
                {"from":"WAID","id":"w2","type":"interactive","interactive":{"type":"list_reply","list_reply":{"id":"p1","title":"Leche 1 L"}}},
                {"from":"WAID","id":"w3","type":"button","button":{"text":"Sí, quiero"}},
                {"from":"WAID","id":"w4","type":"audio","audio":{"id":"MEDIA1"}}
              ]}}]}]}
            """);
        assertThat(r).extracting(MensajeEntrante::texto).containsExactly("Comprar", "Leche 1 L", "Sí, quiero", null);
        assertThat(r.get(3).mediaId()).isEqualTo("MEDIA1");
        assertThat(r.get(3).tipo()).isEqualTo("audio");
    }

    @Test
    void whatsappAcusesDeEntregaSeIgnoran() throws Exception {
        List<MensajeEntrante> r = parsear("""
            {"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{
              "metadata":{"phone_number_id":"PNID"},
              "statuses":[{"id":"wamid.X","status":"delivered","recipient_id":"WAID"}]}}]}]}
            """);
        assertThat(r).isEmpty();
    }

    @Test
    void messengerTextoYPostbackSinEcos() throws Exception {
        List<MensajeEntrante> r = parsear("""
            {"object":"page","entry":[{"id":"PAGE","time":1,"messaging":[
              {"sender":{"id":"PSID"},"recipient":{"id":"PAGE"},"timestamp":1764000000000,"message":{"mid":"m1","text":"Hola"}},
              {"sender":{"id":"PAGE"},"recipient":{"id":"PSID"},"timestamp":1764000000000,"message":{"mid":"m2","text":"eco","is_echo":true}},
              {"sender":{"id":"PSID"},"recipient":{"id":"PAGE"},"timestamp":1764000000000,"read":{"watermark":1}},
              {"sender":{"id":"PSID"},"recipient":{"id":"PAGE"},"timestamp":1764000000000,"postback":{"mid":"m3","title":"Ver más","payload":"VER"}}
            ]}]}
            """);
        assertThat(r).extracting(MensajeEntrante::mensajeId).containsExactly("m1", "m3");
        assertThat(r).allMatch(m -> m.canal() == Canal.MESSENGER && "PAGE".equals(m.cuentaId()) && "PSID".equals(m.remitenteId()));
        assertThat(r.get(0).epochSeg()).isEqualTo(1764000000L);
        assertThat(r.get(1).tipo()).isEqualTo("postback");
    }

    @Test
    void instagramTextoYAdjunto() throws Exception {
        List<MensajeEntrante> r = parsear("""
            {"object":"instagram","entry":[{"id":"IGID","time":1,"messaging":[
              {"sender":{"id":"IGSID"},"recipient":{"id":"IGID"},"timestamp":1,"message":{"mid":"i1","text":"¿Precio?"}},
              {"sender":{"id":"IGSID"},"recipient":{"id":"IGID"},"timestamp":1,"message":{"mid":"i2","attachments":[{"type":"image","payload":{"url":"https://example.test/img"}}]}}
            ]}]}
            """);
        assertThat(r).hasSize(2);
        assertThat(r.get(0).canal()).isEqualTo(Canal.INSTAGRAM);
        assertThat(r.get(0).texto()).isEqualTo("¿Precio?");
        assertThat(r.get(1).tipo()).isEqualTo("image");
        assertThat(r.get(1).texto()).isNull();
    }

    @Test
    void datosRarosNoRompen() throws Exception {
        assertThat(parsear("{}")).isEmpty();
        assertThat(parsear("{\"object\":\"otro\",\"entry\":[{}]}")).isEmpty();
        assertThat(parsear("{\"object\":\"whatsapp_business_account\",\"entry\":\"x\"}")).isEmpty();
        assertThat(parsear("""
            {"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{
              "metadata":{"phone_number_id":"PNID"},"messages":[{"from":"WAID","type":"text","text":{"body":"sin id"}}]}}]}]}
            """)).isEmpty();
        assertThat(parser.parsear(null)).isEmpty();
    }

    @Test
    void idDemasiadoLargoSeDescartaYTextoSeRecorta() throws Exception {
        String idLargo = "w".repeat(MetaWebhookParser.MAX_ID + 1);
        String textoLargo = "a".repeat(MetaWebhookParser.MAX_TEXTO + 50);
        List<MensajeEntrante> r = parsear("""
            {"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{
              "metadata":{"phone_number_id":"PNID"},"messages":[
                {"from":"WAID","id":"%s","type":"text","text":{"body":"x"}},
                {"from":"WAID","id":"ok","type":"text","text":{"body":"%s"}}]}}]}]}
            """.formatted(idLargo, textoLargo));
        assertThat(r).hasSize(1);
        assertThat(r.get(0).texto()).hasSize(MetaWebhookParser.MAX_TEXTO);
    }

    @Test
    void toStringNoExponeRemitenteNiTexto() throws Exception {
        MensajeEntrante m = new MensajeEntrante(Canal.WHATSAPP, "PNID", "WAID-CLIENTE", "Ana", "wamid.ABCDEFGHIJ",
            "text", "dato privado", null, 0);
        assertThat(m.toString()).doesNotContain("WAID-CLIENTE", "Ana", "dato privado", "PNID");
    }
}
