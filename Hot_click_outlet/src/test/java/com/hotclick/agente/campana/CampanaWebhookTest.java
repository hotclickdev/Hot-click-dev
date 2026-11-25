package com.hotclick.agente.campana;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.agente.webhook.EstadoEntrante;
import com.hotclick.agente.webhook.EstadoEntrante.EstadoMensaje;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.agente.webhook.MetaWebhookParser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/** Parseo de {@code statuses} y de {@code message_template_status_update}, y las métricas de entrega y lectura. */
class CampanaWebhookTest extends CampanaFixture {

    private final MetaWebhookParser parser = new MetaWebhookParser();
    private final ObjectMapper om = new ObjectMapper();

    private static final String ESTADOS = """
        {"object":"whatsapp_business_account","entry":[{"id":"WABA1","changes":[
          {"field":"messages","value":{"metadata":{"phone_number_id":"PNID"},
            "statuses":[
              {"id":"wamid.A","status":"delivered","timestamp":"1700000100","recipient_id":"50688880001"},
              {"id":"wamid.A","status":"read","timestamp":"1700000200","recipient_id":"50688880001"},
              {"id":"wamid.B","status":"failed","timestamp":"1700000300","errors":[{"code":131049,"title":"x"}]},
              {"status":"sent"}]}},
          {"field":"message_template_status_update","value":{"event":"APPROVED","message_template_id":"m-9",
            "message_template_name":"oferta","message_template_language":"es"}}]}]}
        """;

    @Test
    @DisplayName("el parseo de estados no rompe el de mensajes: los acuses no son mensajes")
    void parseoDeEstados() throws Exception {
        var raiz = om.readTree(ESTADOS);

        assertThat(parser.parsear(raiz)).isEmpty();
        EstadoEntrante e = parser.parsearEstados(raiz);

        assertThat(e.mensajes()).extracting(EstadoMensaje::estado).containsExactly("delivered", "read", "failed");
        assertThat(e.mensajes().get(2).codigoError()).isEqualTo(131049);
        assertThat(e.mensajes().get(0).toString()).doesNotContain("5068888").doesNotContain("wamid");
        assertThat(e.plantillas()).hasSize(1);
        assertThat(e.plantillas().get(0).plantillaId()).isEqualTo("m-9");
        assertThat(e.plantillas().get(0).evento()).isEqualTo("APPROVED");
    }

    @Test
    @DisplayName("un webhook de mensajes normal sigue dando mensajes y ningún estado; basura no lanza")
    void mensajesIntactosYBasuraTolerada() throws Exception {
        var msg = om.readTree("""
            {"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{
              "metadata":{"phone_number_id":"PNID"},
              "messages":[{"from":"WAID","id":"wamid.1","timestamp":"1","type":"text","text":{"body":"hola"}}]}}]}]}""");

        assertThat(parser.parsear(msg)).hasSize(1);
        assertThat(parser.parsearEstados(msg).sinEventos()).isTrue();
        assertThat(parser.parsearEstados(null).sinEventos()).isTrue();
        assertThat(parser.parsearEstados(om.readTree("{\"object\":\"page\",\"entry\":[{}]}")).sinEventos()).isTrue();
        assertThat(parser.parsearEstados(om.readTree(
            "{\"object\":\"whatsapp_business_account\",\"entry\":[{\"changes\":[{\"field\":\"messages\",\"value\":{\"statuses\":[1,{\"id\":5}]}}]}]}")).mensajes())
            .isEmpty();
    }

    private CampanaWebhookHandlers handlers() {
        return new CampanaWebhookHandlers(campRepo, plantillas, cuentas, CampanaTestSupport.HASHER, config);
    }

    private long envioEnviado(String wamid, String tel) {
        consiente(EMPRESA, tel, "Ana");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), tel);
        jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET estado='ENVIADO', meta_mensaje_id=?, enviado_en=? "
            + "WHERE fk_id_campana=?", wamid, java.sql.Timestamp.from(CampanaTestSupport.AHORA), camp);
        return camp;
    }

    @Test
    @DisplayName("entregado y leído suben las métricas; repetir el acuse o recibirlo desordenado no las retrocede")
    void metricasIdempotentesYMonotonas() {
        long camp = envioEnviado("wamid.A", TEL_ANA);
        CampanaWebhookHandlers h = handlers();

        h.estado(new EstadoMensaje("wamid.A", "read", 1700000200L, 0));      // llega primero la lectura
        h.estado(new EstadoMensaje("wamid.A", "delivered", 1700000100L, 0)); // y después la entrega
        h.estado(new EstadoMensaje("wamid.A", "read", 1700000200L, 0));      // repetido

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("LEIDO");
        CampanaRepositorio.Metricas m = campRepo.metricas(EMPRESA, camp);
        assertThat(m.enviados()).isEqualTo(1);
        assertThat(m.entregados()).isEqualTo(1);
        assertThat(m.leidos()).isEqualTo(1);
        assertThat(m.fallidos()).isZero();
    }

    @Test
    @DisplayName("un acuse failed marca el envío como fallido con el código; un acuse de otro mensaje no toca nada")
    void acuseFallidoYAjeno() {
        long camp = envioEnviado("wamid.B", TEL_ANA);
        CampanaWebhookHandlers h = handlers();

        h.estado(new EstadoMensaje("wamid.OTRO", "delivered", 1L, 0));
        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("ENVIADO");

        h.estado(new EstadoMensaje("wamid.B", "failed", 1L, 131049));
        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("FALLIDO");
        assertThat(motivoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("META_131049");
        assertThat(campRepo.metricas(EMPRESA, camp).fallidos()).isEqualTo(1);
    }

    @Test
    @DisplayName("la respuesta del cliente cuenta para la campaña de su negocio, una sola vez")
    void respuestaDelCliente() {
        long camp = envioEnviado("wamid.A", TEL_ANA);
        when(cuentas.buscar(Canal.WHATSAPP, "PNID")).thenReturn(Optional.of(cuentaWa));
        CampanaWebhookHandlers h = handlers();
        MensajeEntrante respuesta = new MensajeEntrante(Canal.WHATSAPP, "PNID", TEL_ANA, "Ana", "wamid.R1", "text", "me interesa", null, 1L);

        h.manejar(respuesta);
        h.manejar(respuesta);

        assertThat(campRepo.metricas(EMPRESA, camp).respondidos()).isEqualTo(1);
    }

    @Test
    @DisplayName("quien escribe a OTRO negocio no cuenta como respuesta de esta campaña")
    void respuestaEnOtroNegocioNoCuenta() {
        long camp = envioEnviado("wamid.A", TEL_ANA);
        var otraCuenta = CampanaTestSupport.cuenta(OTRA);
        when(cuentas.buscar(Canal.WHATSAPP, "PNID-2")).thenReturn(Optional.of(otraCuenta));

        handlers().manejar(new MensajeEntrante(Canal.WHATSAPP, "PNID-2", TEL_ANA, "Ana", "wamid.R2", "text", "hola", null, 1L));

        assertThat(campRepo.metricas(EMPRESA, camp).respondidos()).isZero();
    }

    @Test
    @DisplayName("el webhook de plantilla aprobada habilita la plantilla")
    void plantillaAprobadaPorWebhook() {
        long id = plRepo.insertar(EMPRESA, "oferta", "es", "Hola {{1}}, ofertas", "[\"Ana\"]", Estado.PENDIENTE, "m-9",
            CampanaTestSupport.AHORA);

        handlers().plantilla(new EstadoEntrante.EstadoPlantilla("m-9", "oferta", "APPROVED", null));

        assertThat(plRepo.obtener(EMPRESA, id).orElseThrow().estado()).isEqualTo(Estado.APROBADA);
    }
}
