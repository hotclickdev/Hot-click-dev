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
import com.hotclick.agente.conversacion.spi.TelefonoVinculadoResolver;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.pago.AvisoPagoBotService;
import com.hotclick.agente.pago.ContextoPago;
import com.hotclick.agente.pago.EnvioConversacion;
import com.hotclick.agente.pago.PagoBotTransicion;
import com.hotclick.agente.pago.PedidoBotEventos;
import com.hotclick.agente.pago.PedidoBotPagadoEvent;
import com.hotclick.agente.panel.AgenteConfigDto;
import com.hotclick.agente.panel.AgenteConfigService;
import com.hotclick.agente.ventas.RespondedorAgente;
import com.hotclick.agente.webhook.MensajeEntranteHandler;
import com.hotclick.agente.webhook.MetaEventoDedup;
import com.hotclick.agente.webhook.MetaWebhookController;
import com.hotclick.agente.webhook.MetaWebhookFirma;
import com.hotclick.agente.webhook.MetaWebhookParser;
import com.hotclick.controller.OnvoWebhookController;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AG-33: flujo de venta completo por WhatsApp, de punta a punta y sin servicios reales.
 *
 * <ol>
 *   <li>Webhook de Meta firmado (X-Hub-Signature-256) entra por {@code POST /api/webhooks/meta}.</li>
 *   <li>Enrutador + respondedor reales; el motor (Claude) es un mock que responde con {@code ENLACE_CREADO}.</li>
 *   <li>El texto con el enlace sale por el canal ({@link MetaCanalMensajeria} contra un servidor Graph simulado).</li>
 *   <li>Webhook de ONVO ({@code POST /api/webhooks/onvo}, controlador real, proveedor simulado) confirma el pago,
 *       el pedido publica el evento del bot y el aviso de confirmación llega al chat y queda en el historial.</li>
 * </ol>
 * Todo con valores ficticios: ni claves, ni teléfonos, ni llamadas a Meta, Claude u ONVO.
 */
class FlujoVentaWhatsAppIntegracionTest {

    private static final String CLAVE_APP_PRUEBA = "clave-app-de-prueba";
    private static final String CLAVE_VERIFICACION_PRUEBA = "clave-verificacion-de-prueba";
    private static final String CLAVE_ONVO_PRUEBA = "clave-onvo-de-prueba";
    private static final String URL_COMPRA = "https://tienda.example/c/CodigoDePrueba01";
    private static final String GRAPH_MENSAJES = "https://graph.facebook.com/v23.0/PNID-PRUEBA/messages";
    private static final String CONTACTO = "contacto-prueba-1";

    private final CanalCuentaService cuentas = mock(CanalCuentaService.class);
    private final ConversacionSesionRepository sesiones = mock(ConversacionSesionRepository.class);
    private final ConversacionMensajeRepository mensajes = mock(ConversacionMensajeRepository.class);
    private final MotorAgente motor = mock(MotorAgente.class);
    private final CanalCuentaRepository cuentasRepo = mock(CanalCuentaRepository.class);
    private final PagoBotTransicion transicion = mock(PagoBotTransicion.class);
    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer graph = MockRestServiceServer.createServer(http);
    private final List<ConversacionSesion> guardadas = new ArrayList<>();
    private final List<ConversacionMensaje> historial = new ArrayList<>();
    private final MetaWebhookFirma firma = new MetaWebhookFirma(CLAVE_APP_PRUEBA, CLAVE_VERIFICACION_PRUEBA);

    private MockMvc mvc;
    private OnvoPaymentProvider onvo;

    @BeforeEach
    void armar() {
        when(sesiones.save(any())).thenAnswer(i -> {
            ConversacionSesion s = i.getArgument(0);
            if (s.getId() == null) { s.setId(UUID.randomUUID()); guardadas.add(s); }
            return s;
        });
        when(sesiones.findFirstByCanalCuentaIdAndContactoExternoAndEstado(any(), any(), any()))
            .thenAnswer(i -> guardadas.stream().filter(s -> s.getContactoExterno().equals(i.getArgument(1))).findFirst());
        when(sesiones.findById(any())).thenAnswer(i ->
            guardadas.stream().filter(s -> s.getId().equals(i.getArgument(0))).findFirst());
        when(mensajes.save(any())).thenAnswer(i -> { historial.add(i.getArgument(0)); return i.getArgument(0); });
        when(mensajes.findTop20BySesionIdOrderByIdDesc(any())).thenAnswer(i -> {
            List<ConversacionMensaje> r = new ArrayList<>(historial);
            Collections.reverse(r);
            return r;
        });

        CanalCuenta cuenta = new CanalCuenta();
        cuenta.setId(5L);
        cuenta.setTipo(com.hotclick.agente.webhook.MensajeEntrante.Canal.WHATSAPP);
        cuenta.setIdExterno("PNID-PRUEBA");
        cuenta.setEmpresaId(7L);
        cuenta.setEstado(EstadoCanal.ACTIVA);
        when(cuentas.buscar(com.hotclick.agente.webhook.MensajeEntrante.Canal.WHATSAPP, "PNID-PRUEBA")).thenReturn(Optional.of(cuenta));
        when(cuentas.tokenDe(cuenta)).thenReturn("token-de-prueba");
        when(cuentasRepo.findById(5L)).thenReturn(Optional.of(cuenta));

        // Claude simulado: crea el enlace y responde con él.
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(new ResultadoAgente(
            "Listo, aquí está tu enlace de compra: " + URL_COMPRA,
            List.of(new AccionAgente(AccionAgente.Tipo.ENLACE_CREADO, URL_COMPRA)),
            null, 0, "modelo-de-prueba", MotivoFin.COMPLETO, 2));

        // Sin teléfonos vinculados: toda conversación de WhatsApp es de ventas (no del modo interno).
        @SuppressWarnings("unchecked")
        ObjectProvider<TelefonoVinculadoResolver> sinVinculados = mock(ObjectProvider.class);
        when(sinVinculados.getIfAvailable()).thenReturn(null);
        ConversacionService conversaciones = new ConversacionService(sesiones, mensajes, mock(UsuarioRepository.class),
            new SelectorPerfil(sinVinculados));
        MetaCanalMensajeria canal = new MetaCanalMensajeria(cuentas, http);
        AgenteConfigService config = mock(AgenteConfigService.class);
        AgenteConfigDto dto = new AgenteConfigDto("el asistente virtual", "TUTEO", false, true, false, List.of(), null, null);
        when(config.obtener(any())).thenReturn(dto);
        when(config.tonoDe(any())).thenReturn(dto.tono());
        RespondedorAgente respondedor = new RespondedorAgente(motor, canal, conversaciones, config);
        @SuppressWarnings("unchecked")
        ObjectProvider<AgenteRespondedor> proveedor = mock(ObjectProvider.class);
        when(proveedor.getIfAvailable()).thenReturn(respondedor);
        EnrutadorConversaciones enrutador = new EnrutadorConversaciones(cuentas, conversaciones, new RespondedorDespacho(proveedor));

        // Webhook de Meta real (firma, parser); el dedup deja pasar todo.
        MetaEventoDedup dedup = mock(MetaEventoDedup.class);
        when(dedup.esNuevo(anyString(), any())).thenReturn(true);
        @SuppressWarnings("unchecked")
        ObjectProvider<MensajeEntranteHandler> handlers = mock(ObjectProvider.class);
        when(handlers.orderedStream()).thenAnswer(i -> Stream.of((MensajeEntranteHandler) enrutador));
        MetaWebhookController meta = new MetaWebhookController(firma, new MetaWebhookParser(), dedup, handlers, new ObjectMapper());

        // Aviso de pago real con el canal real; solo la transición de base de datos es simulada.
        EnvioConversacion envio = new EnvioConversacion(canal, conversaciones, proveedorVacio());
        AvisoPagoBotService aviso = new AvisoPagoBotService(transicion, sesiones, cuentasRepo, conversaciones, envio,
            "https://tienda.example");
        when(transicion.registrarPagado(eq(42L), eq(100L))).thenAnswer(i -> Optional.of(new ContextoPago(
            42L, 7L, guardadas.get(0).getId(), "CodigoDePrueba01", "HC-0100", 12500, LocalDate.of(2026, 12, 10), 0)))
            .thenReturn(Optional.empty());

        // Webhook de ONVO real; el proveedor simulado "confirma" el pago publicando el evento como lo hace el pedido.
        OnvoService onvoService = mock(OnvoService.class);
        when(onvoService.getWebhookSecret()).thenReturn(CLAVE_ONVO_PRUEBA);
        onvo = mock(OnvoPaymentProvider.class);
        OnvoBillingWebhookHandler billing = mock(OnvoBillingWebhookHandler.class);
        when(billing.manejarSiBilling(any(), any(), any())).thenReturn(false);
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
        doAnswer(i -> { aviso.alPagar((PedidoBotPagadoEvent) i.getArgument(0)); return null; })
            .when(publisher).publishEvent(any(PedidoBotPagadoEvent.class));
        when(onvo.procesarPagoVerificado(eq("cs_prueba_1"), anyString())).thenAnswer(i -> {
            Pedido pedido = new Pedido();
            pedido.setId(100L);
            pedido.setEnlaceCompraId(42L);
            PedidoBotEventos.publicarPagado(pedido, publisher);
            return Verificacion.OK;
        }).thenReturn(Verificacion.DUPLICADO);
        OnvoWebhookController onvoControlador = new OnvoWebhookController(
            onvoService, onvo, mock(PosQrVentaService.class), billing, new ObjectMapper());

        mvc = MockMvcBuilders.standaloneSetup(meta, onvoControlador).build();
    }

    @SuppressWarnings("unchecked")
    private static <T> ObjectProvider<T> proveedorVacio() {
        ObjectProvider<T> p = mock(ObjectProvider.class);
        when(p.getIfAvailable(any(java.util.function.Supplier.class))).thenAnswer(i ->
            ((java.util.function.Supplier<T>) i.getArgument(0)).get());
        return p;
    }

    private static String eventoWhatsApp(String texto) {
        return "{\"object\":\"whatsapp_business_account\",\"entry\":[{\"changes\":[{\"field\":\"messages\",\"value\":{"
            + "\"metadata\":{\"phone_number_id\":\"PNID-PRUEBA\"},"
            + "\"messages\":[{\"from\":\"" + CONTACTO + "\",\"id\":\"wamid.prueba1\",\"timestamp\":\"1\",\"type\":\"text\","
            + "\"text\":{\"body\":\"" + texto + "\"}}]}}]}]}";
    }

    private static String firmar(String cuerpo) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(CLAVE_APP_PRUEBA.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "sha256=" + HexFormat.of().formatHex(mac.doFinal(cuerpo.getBytes(StandardCharsets.UTF_8)));
    }

    private void esperarEnvioAlCanal(String fragmentoDelTexto) {
        graph.expect(requestTo(GRAPH_MENSAJES))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer token-de-prueba"))
            .andExpect(jsonPath("$.to").value(CONTACTO))
            .andExpect(jsonPath("$.text.body").value(org.hamcrest.Matchers.containsString(fragmentoDelTexto)))
            .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.salida\"}]}", MediaType.APPLICATION_JSON));
    }

    private String onvoPagoConfirmado() {
        return "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"cs_prueba_1\"}}";
    }

    @Test
    void ventaCompletaDelMensajeAlPagoConfirmadoEnElChat() throws Exception {
        // 1) Webhook firmado → motor (mock) responde ENLACE_CREADO → el enlace sale por el canal.
        esperarEnvioAlCanal(URL_COMPRA);
        String cuerpo = eventoWhatsApp("Quiero comprar una taza");
        mvc.perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", firmar(cuerpo)).content(cuerpo))
            .andExpect(status().isOk());

        assertThat(guardadas).singleElement().satisfies(s -> {
            assertThat(s.getCanal()).isEqualTo("WHATSAPP");
            assertThat(s.getContactoExterno()).isEqualTo(CONTACTO);
        });
        assertThat(historial).extracting(ConversacionMensaje::getRol).containsExactly("user", "assistant");
        assertThat(historial.get(1).getContenido()).contains(URL_COMPRA);
        graph.verify();

        // 2) Webhook de ONVO (secret válido) → pago verificado → confirmación al chat.
        graph.reset();
        esperarEnvioAlCanal("Pago recibido");
        mvc.perform(post("/api/webhooks/onvo").contentType(MediaType.APPLICATION_JSON)
                .header("X-Webhook-Secret", CLAVE_ONVO_PRUEBA).content(onvoPagoConfirmado()))
            .andExpect(status().isOk());

        graph.verify();
        assertThat(historial).extracting(ConversacionMensaje::getRol).containsExactly("user", "assistant", "assistant");
        assertThat(historial.get(2).getContenido()).contains("HC-0100").contains("₡12.500").contains("confirmado");
    }

    @Test
    void elReintentoDelWebhookDeOnvoNoDuplicaLaConfirmacion() throws Exception {
        esperarEnvioAlCanal(URL_COMPRA);
        String cuerpo = eventoWhatsApp("Hola");
        mvc.perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
            .header("X-Hub-Signature-256", firmar(cuerpo)).content(cuerpo)).andExpect(status().isOk());
        graph.reset();

        esperarEnvioAlCanal("Pago recibido"); // una sola llamada esperada a Meta
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/webhooks/onvo").contentType(MediaType.APPLICATION_JSON)
                    .header("X-Webhook-Secret", CLAVE_ONVO_PRUEBA).content(onvoPagoConfirmado()))
                .andExpect(status().isOk());
        }
        graph.verify();
        assertThat(historial).filteredOn(m -> m.getContenido().contains("Pago recibido")).hasSize(1);
    }

    @Test
    void sinFirmaValidaNadaLlegaAlMotorYConSecretOnvoMaloNadaSeConfirma() throws Exception {
        String cuerpo = eventoWhatsApp("Hola");
        mvc.perform(post("/api/webhooks/meta").contentType(MediaType.APPLICATION_JSON)
                .header("X-Hub-Signature-256", "sha256=" + "0".repeat(64)).content(cuerpo))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/webhooks/onvo").contentType(MediaType.APPLICATION_JSON)
                .header("X-Webhook-Secret", "otro").content(onvoPagoConfirmado()))
            .andExpect(status().isUnauthorized());

        assertThat(guardadas).isEmpty();
        assertThat(historial).isEmpty();
        org.mockito.Mockito.verifyNoInteractions(motor, onvo);
        graph.verify(); // ninguna llamada a Meta
        org.mockito.Mockito.verify(transicion, org.mockito.Mockito.never()).registrarPagado(anyLong(), anyLong());
    }
}
