package com.hotclick.agente.canal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.EnrutadorConversaciones;
import com.hotclick.agente.conversacion.RespondedorDespacho;
import com.hotclick.agente.conversacion.SelectorPerfil;
import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.ventas.RespondedorAgente;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.agente.webhook.MetaWebhookParser;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * AG-31: un mensaje de Instagram y otro de Messenger recorren webhook (parser) → enrutador → respondedor →
 * MetaCanalMensajeria (Send API, {@code /me/messages}) y quedan guardados con su canal. Sin llamadas reales a Meta.
 */
class CanalesSocialesFlujoTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final CanalCuentaService cuentas = mock(CanalCuentaService.class);
    private final ConversacionSesionRepository sesiones = mock(ConversacionSesionRepository.class);
    private final ConversacionMensajeRepository mensajes = mock(ConversacionMensajeRepository.class);
    private final MotorAgente motor = mock(MotorAgente.class);
    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer meta = MockRestServiceServer.createServer(http);
    private final List<ConversacionSesion> guardadas = new ArrayList<>();
    private final List<ConversacionMensaje> msgs = new ArrayList<>();
    private EnrutadorConversaciones enrutador;

    @SuppressWarnings("unchecked")
    private void armar() {
        when(sesiones.save(any())).thenAnswer(i -> {
            ConversacionSesion s = i.getArgument(0);
            if (s.getId() == null) { s.setId(UUID.randomUUID()); guardadas.add(s); }
            return s;
        });
        when(sesiones.findFirstByCanalCuentaIdAndContactoExternoAndEstado(any(), any(), any()))
            .thenAnswer(i -> guardadas.stream().filter(s -> s.getContactoExterno().equals(i.getArgument(1))).findFirst());
        when(sesiones.findById(any())).thenAnswer(i -> guardadas.stream().filter(s -> s.getId().equals(i.getArgument(0))).findFirst());
        when(mensajes.save(any())).thenAnswer(i -> { msgs.add(i.getArgument(0)); return i.getArgument(0); });
        when(mensajes.findTop20BySesionIdOrderByIdDesc(any())).thenAnswer(i -> {
            List<ConversacionMensaje> r = new ArrayList<>(msgs);
            java.util.Collections.reverse(r);
            return r;
        });
        when(motor.ejecutar(any(), any(), any(), anyString())).thenReturn(
            new ResultadoAgente("Hola, con gusto te ayudo", List.of(), null, 0, "m", MotivoFin.COMPLETO, 1));

        ConversacionService conv = new ConversacionService(sesiones, mensajes, mock(UsuarioRepository.class),
            new SelectorPerfil(null));
        MetaCanalMensajeria canal = new MetaCanalMensajeria(cuentas, http);
        RespondedorAgente respondedor = new RespondedorAgente(motor, canal, conv);
        @SuppressWarnings("rawtypes")
        ObjectProvider<AgenteRespondedor> proveedor = mock(ObjectProvider.class);
        when(proveedor.getIfAvailable()).thenReturn(respondedor);
        // Llamado directo (sin proxy): el despacho @Async corre en el mismo hilo.
        enrutador = new EnrutadorConversaciones(cuentas, conv, new RespondedorDespacho(proveedor));
    }

    private CanalCuenta cuenta(Canal tipo, String idExterno, String token) {
        CanalCuenta c = new CanalCuenta();
        c.setId(tipo == Canal.INSTAGRAM ? 20L : 30L);
        c.setTipo(tipo);
        c.setIdExterno(idExterno);
        c.setEmpresaId(7L);
        c.setEstado(EstadoCanal.ACTIVA);
        when(cuentas.buscar(tipo, idExterno)).thenReturn(Optional.of(c));
        when(cuentas.tokenDe(c)).thenReturn(token);
        return c;
    }

    private static String payload(String objeto, String cuentaId, String remitente, String mid, String texto) {
        return "{\"object\":\"" + objeto + "\",\"entry\":[{\"id\":\"" + cuentaId + "\",\"time\":1,\"messaging\":[{"
            + "\"sender\":{\"id\":\"" + remitente + "\"},\"recipient\":{\"id\":\"" + cuentaId + "\"},\"timestamp\":1,"
            + "\"message\":{\"mid\":\"" + mid + "\",\"text\":\"" + texto + "\"}}]}]}";
    }

    private void recorrer(String json, String respuestaSendApi) throws Exception {
        meta.expect(requestTo("https://graph.facebook.com/v19.0/me/messages"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer TOK-PAGINA"))
            .andExpect(jsonPath("$.messaging_type").value("RESPONSE"))
            .andExpect(jsonPath("$.message.text").value("Hola, con gusto te ayudo"))
            .andRespond(withSuccess(respuestaSendApi, MediaType.APPLICATION_JSON));
        List<MensajeEntrante> entrantes = new MetaWebhookParser().parsear(JSON.readTree(json));
        assertThat(entrantes).hasSize(1);
        enrutador.manejar(entrantes.get(0));
    }

    @Test
    void instagramLlegaAlMotorYSeResponde() throws Exception {
        armar();
        cuenta(Canal.INSTAGRAM, "IG-100", "TOK-PAGINA");
        meta.expect(requestTo("https://graph.facebook.com/v19.0/me/messages"))
            .andExpect(jsonPath("$.recipient.id").value("IGSID-9"))
            .andRespond(withSuccess("{\"recipient_id\":\"IGSID-9\",\"message_id\":\"mid.ig1\"}", MediaType.APPLICATION_JSON));
        enrutadorDe(payload("instagram", "IG-100", "IGSID-9", "mid.1", "precio del bolso?"));

        meta.verify();
        assertThat(guardadas).singleElement().satisfies(s -> {
            assertThat(s.getCanal()).isEqualTo("INSTAGRAM");
            assertThat(s.getEmpresaId()).isEqualTo(7L);
            assertThat(s.getContactoExterno()).isEqualTo("IGSID-9");
        });
        // cliente + respuesta del bot guardadas
        assertThat(msgs).extracting(ConversacionMensaje::getRol).containsExactly("user", "assistant");
    }

    @Test
    void messengerLlegaAlMotorYSeResponde() throws Exception {
        armar();
        cuenta(Canal.MESSENGER, "PAGE-55", "TOK-PAGINA");
        recorrer(payload("page", "PAGE-55", "PSID-3", "mid.2", "hola"),
            "{\"recipient_id\":\"PSID-3\",\"message_id\":\"mid.fb1\"}");

        meta.verify();
        assertThat(guardadas).singleElement().satisfies(s -> {
            assertThat(s.getCanal()).isEqualTo("MESSENGER");
            assertThat(s.getContactoExterno()).isEqualTo("PSID-3");
        });
        assertThat(msgs).extracting(ConversacionMensaje::getRol).containsExactly("user", "assistant");
    }

    @Test
    void cuentaDesconectadaNoRecibeNiResponde() throws Exception {
        armar();
        CanalCuenta c = cuenta(Canal.INSTAGRAM, "IG-100", "TOK-PAGINA");
        c.setEstado(EstadoCanal.DESCONECTADA);
        enrutadorDe(payload("instagram", "IG-100", "IGSID-9", "mid.3", "hola"));
        meta.verify(); // no se esperó ninguna llamada a Meta
        assertThat(guardadas).isEmpty();
    }

    private void enrutadorDe(String json) throws Exception {
        List<MensajeEntrante> entrantes = new MetaWebhookParser().parsear(JSON.readTree(json));
        assertThat(entrantes).hasSize(1);
        assertThat(entrantes.get(0).canal()).isIn(Canal.INSTAGRAM, Canal.MESSENGER);
        enrutador.manejar(entrantes.get(0));
    }
}
