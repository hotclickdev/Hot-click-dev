package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.TilopayService;
import com.hotclick.service.payment.AvisoReembolsoPendienteService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MEDIO área 1 (4610d4748): ONVO cobra un grupo ya CANCELADO → el pago queda REEMBOLSO_PENDIENTE y el admin IT
 * recibe UN aviso (dedupe en base por pago, V216/V217). Si el envío falla, el pago sigue REEMBOLSO_PENDIENTE y
 * reintenta el barrido al vencer el lease (BAJOs #466).
 * Spring + H2 de test, webhook real por MockMvc; solo el correo saliente está mockeado.
 */
@DisplayName("[Aviso admin] Cobro ONVO sobre grupo cancelado: aviso al admin con dedupe y fail-safe")
class AvisoReembolsoPendienteIntegracionTest extends BaseIntegrationTest {

    private static final String SESION = "cs_aviso_cancelado";
    private static final String INTENT = "pi_aviso_cancelado";
    private final String cabeceraWebhook = java.util.UUID.randomUUID().toString();

    // Mismo set de @MockitoBean que OnvoSobreventaPostCobroTest: reutiliza ese contexto de Spring en vez de crear
    // uno nuevo. Un contexto extra empuja el cache (máx. 32) a desalojar otro, y su create-drop borra el esquema del
    // H2 compartido (testdb) a tests que vienen después (#466, HOT_CLICK_REFRESH_TOKEN_TB not found).
    @MockitoBean private OnvoService onvoService;
    @MockitoBean private TilopayService tilopayService;

    @Autowired private AvisoReembolsoPendienteService aviso;
    @Autowired private org.springframework.transaction.PlatformTransactionManager txManager;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    private Empresa empresa;
    private Bodega bodega;

    @BeforeEach
    void armar() {
        reset(notificacionEmailService);
        when(onvoService.getWebhookSecret()).thenReturn(cabeceraWebhook);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("live");
        doReturn(Map.of("paymentStatus", "paid", "status", "complete", "paymentIntentId", INTENT, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "live"))
            .when(onvoService).obtenerPaymentIntent(INTENT);

        String slug = "aviso-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("Aviso");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Aviso");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setProvincia("San José");
        bodega.setCanton("Escazú");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
    }

    @AfterEach
    void limpiar() {
        webhookEventRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    /** Pedido ya CANCELADO (expiró o lo canceló el comprador) con su pago ONVO todavía PENDIENTE. */
    private Pago pagoSobreCancelado() {
        Pedido p = new Pedido();
        p.setNumeroPedido("AV-" + (System.nanoTime() % 1_000_000));
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago(Constants.PROVEEDOR_ONVO);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        p = pedidoRepository.saveAndFlush(p);

        Pago pago = new Pago();
        pago.setMerchantToken(SESION);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        return pagoRepository.saveAndFlush(pago);
    }

    private void webhook() throws Exception {
        mockMvc.perform(post("/api/webhooks/onvo")
                .header("X-Webhook-Secret", cabeceraWebhook)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"" + SESION + "\"}}"))
            .andExpect(status().isOk());
    }

    private Pago enBase(Pago p) { return pagoRepository.findById(p.getId()).orElseThrow(); }

    /** El envío corre en taskExecutor: espera acotada a que la condición se cumpla. */
    private void esperar(java.util.function.BooleanSupplier cond, String que) throws InterruptedException {
        long fin = System.currentTimeMillis() + 10_000;
        while (!cond.getAsBoolean()) {
            if (System.currentTimeMillis() > fin) throw new AssertionError("timeout esperando: " + que);
            Thread.sleep(50);
        }
    }

    private static final org.mockito.verification.VerificationWithTimeout ASYNC = timeout(10_000);

    /** Simula un lease vencido corriendo el claim hacia atrás. */
    private void vencerLease(Pago p) {
        Pago enBd = enBase(p);
        enBd.setAvisoReembolsoAdminEn(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(20));
        pagoRepository.saveAndFlush(enBd);
    }

    private Pago reembolsoPendiente() {
        Pago pago = pagoSobreCancelado();
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setMerchantToken(SESION + "_" + System.nanoTime());
        return pagoRepository.saveAndFlush(pago);
    }

    @Test
    @DisplayName("Cobro sobre cancelado → REEMBOLSO_PENDIENTE y un aviso al admin con id, estado y link (sin PII)")
    void avisaAlAdmin() throws Exception {
        Pago pago = pagoSobreCancelado();

        webhook();

        assertThat(enBase(pago).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(notificacionEmailService, ASYNC.times(1)).enviarAvisoReembolsoPendienteAAdminIT(
            eq(pago.getId()), eq(Constants.PAGO_REEMBOLSO_PENDIENTE), org.mockito.ArgumentMatchers.endsWith("/plataforma/dinero/cobros"), any(), any());
        esperar(() -> enBase(pago).getAvisoReembolsoAdminEnviadoEn() != null, "envío confirmado");
        assertThat(enBase(pago).getAvisoReembolsoAdminEn()).isNotNull();
        assertThat(enBase(pago).getAvisoReembolsoAdminIntentos()).isEqualTo(1);
    }

    @Test
    @DisplayName("Dedupe: webhook repetido, reintento directo y barrido no mandan un segundo correo para el mismo pago")
    void dedupePorPago() throws Exception {
        Pago pago = pagoSobreCancelado();

        webhook();
        webhook();
        esperar(() -> enBase(pago).getAvisoReembolsoAdminEnviadoEn() != null, "envío confirmado");
        assertThat(aviso.avisar(pago.getId())).isFalse();
        vencerLease(pago);
        assertThat(aviso.barrer()).as("enviado: el barrido no reenvía aunque venza el lease").isZero();

        verify(notificacionEmailService, after(300).times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        assertThat(enBase(pago).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("BAJO #466: el webhook no espera el envío (afterCommit solo encola)")
    void webhookNoBloqueadoPorElEnvio() throws Exception {
        java.util.concurrent.CountDownLatch soltar = new java.util.concurrent.CountDownLatch(1);
        org.mockito.Mockito.doAnswer(inv -> { soltar.await(20, java.util.concurrent.TimeUnit.SECONDS); return null; })
            .when(notificacionEmailService).enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        Pago pago = pagoSobreCancelado();
        try {
            long t0 = System.nanoTime();
            webhook();
            long ms = (System.nanoTime() - t0) / 1_000_000;
            assertThat(ms).as("webhook respondió sin esperar el correo colgado").isLessThan(5_000);
            assertThat(enBase(pago).getAvisoReembolsoAdminEnviadoEn()).as("todavía no confirmado").isNull();
        } finally {
            soltar.countDown();
        }
        esperar(() -> enBase(pago).getAvisoReembolsoAdminEnviadoEn() != null, "envío confirmado al soltar");
    }

    @Test
    @DisplayName("Fail-safe: si el envío falla, ONVO recibe 200, el pago sigue REEMBOLSO_PENDIENTE y la marca NO se libera")
    void falloDelEnvioNoRompeElFlujo() throws Exception {
        doThrow(new RuntimeException("smtp caído")).when(notificacionEmailService)
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        Pago pago = pagoSobreCancelado();

        webhook();

        verify(notificacionEmailService, ASYNC.times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        esperar(() -> enBase(pago).getAvisoReembolsoAdminEn() != null, "claim registrado");
        assertThat(enBase(pago).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(enBase(pago).getAvisoReembolsoAdminEnviadoEn()).isNull();
        assertThat(aviso.avisar(pago.getId())).as("dentro del lease no se reintenta").isFalse();
    }

    @Test
    @DisplayName("BAJO #466: un timeout (el correo pudo salir) no reenvía al instante; el barrido reintenta al vencer el lease, una vez")
    void timeoutNoReenviaHastaVencerLease() throws Exception {
        doThrow(new com.hotclick.exception.IntegracionExternaException("sendgrid",
                com.hotclick.exception.IntegracionExternaException.Tipo.IO_ERROR, "x", new java.net.SocketTimeoutException("read")))
            .doNothing().when(notificacionEmailService)
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        Pago pago = pagoSobreCancelado();

        webhook();
        verify(notificacionEmailService, ASYNC.times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        esperar(() -> enBase(pago).getAvisoReembolsoAdminEn() != null, "claim registrado");

        webhook();
        assertThat(aviso.avisar(pago.getId())).isFalse();
        assertThat(aviso.barrer()).as("lease vigente").isZero();

        vencerLease(pago);
        assertThat(aviso.barrer()).isEqualTo(1);
        assertThat(enBase(pago).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
        assertThat(enBase(pago).getAvisoReembolsoAdminIntentos()).isEqualTo(2);
        vencerLease(pago);
        assertThat(aviso.barrer()).isZero();
        verify(notificacionEmailService, after(300).times(2))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("BAJO #466: marca huérfana (claim sin envío) se recupera por barrido; lease vigente no; sin claim (otro origen) no")
    void barridoRecuperaHuerfanas() {
        Pago huerfana = reembolsoPendiente();
        vencerLease(huerfana);
        Pago vigente = reembolsoPendiente();
        Pago vig = enBase(vigente);
        vig.setAvisoReembolsoAdminEn(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        pagoRepository.saveAndFlush(vig);
        Pago sinClaim = reembolsoPendiente();

        assertThat(aviso.barrer()).isEqualTo(1);
        assertThat(enBase(huerfana).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
        assertThat(enBase(sinClaim).getAvisoReembolsoAdminEnviadoEn())
            .as("REEMBOLSO_PENDIENTE de SINPE/sobreventa no usa este aviso").isNull();
        assertThat(enBase(vigente).getAvisoReembolsoAdminEnviadoEn()).isNull();
        verify(notificacionEmailService, never()).enviarAvisoReembolsoPendienteAAdminIT(eq(vigente.getId()), anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("BAJO #466: con el tope de intentos agotado el barrido no reintenta")
    void topeDeIntentos() {
        Pago pago = reembolsoPendiente();
        Pago p = enBase(pago);
        p.setAvisoReembolsoAdminIntentos(5);
        p.setAvisoReembolsoAdminEn(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(60));
        pagoRepository.saveAndFlush(p);

        assertThat(aviso.barrer()).isZero();
        verify(notificacionEmailService, never()).enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("Concurrencia: dos claims simultáneos sobre el mismo pago → un solo correo")
    void dosClaimsSimultaneos() throws Exception {
        Pago pago = pagoSobreCancelado();
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pagoRepository.saveAndFlush(pago);

        java.util.concurrent.CyclicBarrier barrera = new java.util.concurrent.CyclicBarrier(2);
        java.util.concurrent.ExecutorService hilos = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            java.util.concurrent.Callable<Boolean> intento = () -> { barrera.await(); return aviso.avisar(pago.getId()); };
            var f1 = hilos.submit(intento);
            var f2 = hilos.submit(intento);
            boolean r1 = f1.get(30, java.util.concurrent.TimeUnit.SECONDS);
            boolean r2 = f2.get(30, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(r1 ^ r2).as("exactamente uno gana el claim").isTrue();
        } finally {
            hilos.shutdownNow();
        }
        verify(notificacionEmailService, times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("Un pago que no está REEMBOLSO_PENDIENTE no dispara aviso")
    void soloReembolsoPendiente() {
        Pago pago = pagoSobreCancelado();
        assertThat(aviso.avisar(pago.getId())).isFalse();
        verify(notificacionEmailService, never())
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
    }

    private Pago viejo() {
        Pago p = reembolsoPendiente();
        p.setAvisoReembolsoResumenPendiente(true);
        return pagoRepository.saveAndFlush(p);
    }

    @Test
    @DisplayName("Punto 4 #477: N pagos viejos → UN solo correo resumen; quedan avisados y el segundo barrido no reenvía")
    void resumenViejosUnSoloCorreo() {
        Pago a = viejo(), b = viejo(), c = viejo();
        Pago nuevo = reembolsoPendiente();
        vencerLease(nuevo);

        aviso.barrer();

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<List<com.hotclick.service.email.ReembolsoPendienteResumenItem>> lista =
            org.mockito.ArgumentCaptor.forClass(List.class);
        verify(notificacionEmailService, times(1)).enviarResumenReembolsosPendientesAAdminIT(lista.capture(), anyString());
        assertThat(lista.getValue()).extracting(com.hotclick.service.email.ReembolsoPendienteResumenItem::pagoId)
            .containsExactly(a.getId(), b.getId(), c.getId());
        for (Pago p : List.of(a, b, c)) {
            assertThat(enBase(p).isAvisoReembolsoResumenPendiente()).isFalse();
            assertThat(enBase(p).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
        }
        // Los viejos no reciben aviso individual; el de V217 en adelante sí.
        verify(notificacionEmailService, times(1)).enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        verify(notificacionEmailService).enviarAvisoReembolsoPendienteAAdminIT(eq(nuevo.getId()), anyString(), anyString(), any(), any());

        aviso.barrer();
        verify(notificacionEmailService, times(1)).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());
        verify(notificacionEmailService, times(1)).enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("Punto 4 #477: si el resumen falla o falta adminit.email, los viejos NO se marcan y se reintenta")
    void resumenFallidoNoMarca() {
        doThrow(new RuntimeException("smtp caído"))
            .doThrow(new com.hotclick.service.email.AdminItSinCorreoException())
            .doNothing()
            .when(notificacionEmailService).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());
        Pago a = viejo(), b = viejo();

        assertThat(aviso.enviarResumenViejos()).isFalse();
        assertThat(aviso.enviarResumenViejos()).isFalse();
        for (Pago p : List.of(a, b)) {
            assertThat(enBase(p).isAvisoReembolsoResumenPendiente()).isTrue();
            assertThat(enBase(p).getAvisoReembolsoAdminEnviadoEn()).isNull();
        }
        assertThat(aviso.enviarResumenViejos()).isTrue();
        assertThat(enBase(a).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
        assertThat(aviso.enviarResumenViejos()).isFalse();
        verify(notificacionEmailService, times(3)).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());
    }

    @Test
    @DisplayName("BAJO 3 #477: sin adminit.email el aviso individual NO se marca enviado")
    void sinAdminItNoMarcaEnviado() {
        doThrow(new com.hotclick.service.email.AdminItSinCorreoException()).when(notificacionEmailService)
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        Pago pago = reembolsoPendiente();

        assertThat(aviso.avisar(pago.getId())).isFalse();
        assertThat(enBase(pago).getAvisoReembolsoAdminEnviadoEn()).isNull();
        assertThat(enBase(pago).getAvisoReembolsoAdminEn()).as("claim queda para el barrido").isNotNull();
    }

    @Test
    @DisplayName("BAJO 2 #477: el barrido respeta el lote y el tope de tiempo (no excede lockAtMostFor)")
    void barridoAcotado() {
        vencerLease(reembolsoPendiente());
        vencerLease(reembolsoPendiente());
        vencerLease(reembolsoPendiente());
        Object loteOrig = org.springframework.test.util.ReflectionTestUtils.getField(aviso, "lote");
        Object segOrig = org.springframework.test.util.ReflectionTestUtils.getField(aviso, "maxSegundos");
        try {
            org.springframework.test.util.ReflectionTestUtils.setField(aviso, "maxSegundos", 0L);
            assertThat(aviso.barrer()).as("sin tiempo no procesa").isZero();
            org.springframework.test.util.ReflectionTestUtils.setField(aviso, "maxSegundos", 300L);
            org.springframework.test.util.ReflectionTestUtils.setField(aviso, "lote", 2);
            assertThat(aviso.barrer()).isEqualTo(2);
            assertThat(aviso.barrer()).isEqualTo(1);
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(aviso, "lote", loteOrig);
            org.springframework.test.util.ReflectionTestUtils.setField(aviso, "maxSegundos", segOrig);
        }
    }

    @Test
    @DisplayName("BAJO 1 #477: un aviso descartado por cola llena queda con claim vencido y lo envía el barrido")
    void descartadoLoTomaElBarrido() {
        Pago pago = reembolsoPendiente();
        aviso.marcarParaBarrido(pago.getId());
        assertThat(enBase(pago).getAvisoReembolsoAdminEn()).isNotNull();
        assertThat(enBase(pago).getAvisoReembolsoAdminIntentos()).isZero();
        assertThat(aviso.barrer()).isEqualTo(1);
        assertThat(enBase(pago).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
    }

    /** Pago viejo (pre-V217, sin claim) con el estado que deja cada origen. */
    private Pago viejoDe(String origen) {
        Pago p = viejo();
        switch (origen) {
            case "SINPE" -> p.setMerchantToken("ONVOPI:pi_" + System.nanoTime());
            case "SOBREVENTA" -> {
                Pedido ped = pedidoRepository.findById(p.getPedido().getId()).orElseThrow();
                ped.setEstadoPedido(Constants.PEDIDO_REVISION_SOBREVENTA);
                pedidoRepository.saveAndFlush(ped);
            }
            case "OTRO" -> p.setProveedor(Constants.PROVEEDOR_TILOPAY);
            default -> { }
        }
        return pagoRepository.saveAndFlush(p);
    }

    @SuppressWarnings("unchecked")
    private List<com.hotclick.service.email.ReembolsoPendienteResumenItem> resumenesEnviados(int veces) {
        org.mockito.ArgumentCaptor<List<com.hotclick.service.email.ReembolsoPendienteResumenItem>> c =
            org.mockito.ArgumentCaptor.forClass(List.class);
        verify(notificacionEmailService, times(veces)).enviarResumenReembolsosPendientesAAdminIT(c.capture(), anyString());
        return c.getValue();
    }

    @Test
    @DisplayName("Resumen #477: agrupa por origen (ONVO sobre cancelado, SINPE, sobreventa, otro)")
    void resumenAgrupaPorOrigen() {
        Pago onvo = viejoDe("ONVO"), sinpe = viejoDe("SINPE"), sobre = viejoDe("SOBREVENTA"), otro = viejoDe("OTRO");

        assertThat(aviso.enviarResumenViejos()).isTrue();

        var porId = new java.util.HashMap<Long, com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen>();
        resumenesEnviados(1).forEach(i -> porId.put(i.pagoId(), i.origen()));
        assertThat(porId).containsEntry(onvo.getId(), com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.ONVO_CANCELADO)
            .containsEntry(sinpe.getId(), com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.SINPE)
            .containsEntry(sobre.getId(), com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.SOBREVENTA)
            .containsEntry(otro.getId(), com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.OTRO)
            .hasSize(4);
    }

    @Test
    @DisplayName("Resumen #477: los viejos de SINPE y sobreventa sin claim siempre entran en el resumen (y no en el barrido individual)")
    void sinpeYSobreventaViejosEntranEnResumen() {
        Pago sinpe = viejoDe("SINPE"), sobre = viejoDe("SOBREVENTA");

        aviso.barrer();

        assertThat(resumenesEnviados(1)).extracting(com.hotclick.service.email.ReembolsoPendienteResumenItem::pagoId)
            .containsExactlyInAnyOrder(sinpe.getId(), sobre.getId());
        verify(notificacionEmailService, never()).enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString(), any(), any());
        assertThat(enBase(sinpe).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
        assertThat(enBase(sobre).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
    }

    @Test
    @DisplayName("Resumen #477: si el envío falla ninguno queda marcado y el siguiente barrido vuelve a incluirlos todos")
    void resumenFallidoSeReincluyeEnteroEnElSiguienteBarrido() {
        doThrow(new RuntimeException("smtp caído")).doNothing()
            .when(notificacionEmailService).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());
        Pago onvo = viejoDe("ONVO"), sinpe = viejoDe("SINPE"), sobre = viejoDe("SOBREVENTA");

        aviso.barrer();
        for (Pago p : List.of(onvo, sinpe, sobre)) {
            assertThat(enBase(p).isAvisoReembolsoResumenPendiente()).isTrue();
            assertThat(enBase(p).getAvisoReembolsoAdminEnviadoEn()).isNull();
            assertThat(enBase(p).getAvisoReembolsoAdminEn()).isNull();
        }

        aviso.barrer();
        assertThat(resumenesEnviados(2)).extracting(com.hotclick.service.email.ReembolsoPendienteResumenItem::pagoId)
            .containsExactlyInAnyOrder(onvo.getId(), sinpe.getId(), sobre.getId());
        for (Pago p : List.of(onvo, sinpe, sobre)) assertThat(enBase(p).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
    }

    // ── PR siguiente a #477: aviso individual de todo REEMBOLSO_PENDIENTE nuevo + BAJOs de Seguridad ──

    /** REEMBOLSO_PENDIENTE nuevo (sin marca de resumen ni claim) con el estado que deja cada origen. */
    private Pago nuevoDe(String origen) {
        Pago p = enBase(viejoDe(origen));
        p.setAvisoReembolsoResumenPendiente(false);
        p.setAvisoReembolsoAdminEn(null);
        return pagoRepository.saveAndFlush(p);
    }

    private com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen origenEsperado(String o) {
        return switch (o) {
            case "SINPE" -> com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.SINPE;
            case "SOBREVENTA" -> com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.SOBREVENTA;
            default -> com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.ONVO_CANCELADO;
        };
    }

    /** Corre en una transacción como lo hacen OnvoCapturaService, SinpeOnvoMarketplaceService y PaymentOrderConfirmationService. */
    private void enTransaccion(java.util.function.Consumer<Pago> paso, Pago p) {
        new org.springframework.transaction.support.TransactionTemplate(txManager).executeWithoutResult(st -> {
            Pago gestionado = pagoRepository.findById(p.getId()).orElseThrow();
            paso.accept(gestionado);
            pagoRepository.save(gestionado);
        });
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {"ONVO", "SINPE", "SOBREVENTA"})
    @DisplayName("Todo REEMBOLSO_PENDIENTE nuevo avisa al admin IT una sola vez, con el texto de su origen")
    void avisoIndividualPorOrigen(String origen) throws Exception {
        Pago p = nuevoDe(origen);

        enTransaccion(aviso::registrarPendiente, p);
        enTransaccion(aviso::registrarPendiente, p); // reintento del webhook: dedupe

        verify(notificacionEmailService, ASYNC.times(1)).enviarAvisoReembolsoPendienteAAdminIT(
            eq(p.getId()), eq(Constants.PAGO_REEMBOLSO_PENDIENTE), anyString(), eq(origenEsperado(origen)), any());
        esperar(() -> enBase(p).getAvisoReembolsoAdminEnviadoEn() != null, "envío confirmado");
        verify(notificacionEmailService, after(500).times(1)).enviarAvisoReembolsoPendienteAAdminIT(
            eq(p.getId()), anyString(), anyString(), any(), any());
        assertThat(enBase(p).getAvisoReembolsoAdminIntentos()).isEqualTo(1);
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {"ONVO", "SINPE", "SOBREVENTA"})
    @DisplayName("BAJO 1: si el proceso cae antes del despacho, la marca ya está en la base y el barrido lo avisa")
    void caidaAntesDelDespachoLoTomaElBarrido(String origen) {
        Pago p = nuevoDe(origen);

        // Solo el commit de la transacción del cambio de estado (sin afterCommit = proceso caído).
        enTransaccion(aviso::marcarPendienteEnTransaccion, p);
        assertThat(enBase(p).getAvisoReembolsoAdminEn()).isNotNull();
        assertThat(enBase(p).getAvisoReembolsoAdminEnviadoEn()).isNull();

        aviso.barrer();

        verify(notificacionEmailService, times(1)).enviarAvisoReembolsoPendienteAAdminIT(
            eq(p.getId()), eq(Constants.PAGO_REEMBOLSO_PENDIENTE), anyString(), eq(origenEsperado(origen)), any());
        assertThat(enBase(p).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
    }

    @Test
    @DisplayName("BAJO 2: el resumen respeta el tope de lote y no arranca si el barrido ya no tiene tiempo")
    void resumenRespetaTopes() {
        org.springframework.test.util.ReflectionTestUtils.setField(
            (Object) org.springframework.test.util.AopTestUtils.<Object>getTargetObject(aviso), "resumenLote", 2);
        try {
            Pago a = viejo(), b = viejo(), c = viejo();

            assertThat(aviso.enviarResumenViejos(System.nanoTime() - 1)).isFalse();
            verify(notificacionEmailService, never()).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());

            assertThat(aviso.enviarResumenViejos()).isTrue();
            assertThat(resumenesEnviados(1)).extracting(com.hotclick.service.email.ReembolsoPendienteResumenItem::pagoId)
                .containsExactly(a.getId(), b.getId());
            assertThat(enBase(c).getAvisoReembolsoAdminEnviadoEn()).isNull();

            assertThat(aviso.enviarResumenViejos()).isTrue();
            assertThat(resumenesEnviados(2)).extracting(com.hotclick.service.email.ReembolsoPendienteResumenItem::pagoId)
                .containsExactly(c.getId());
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(
                (Object) org.springframework.test.util.AopTestUtils.<Object>getTargetObject(aviso), "resumenLote", 200);
        }
    }

    @Test
    @DisplayName("BAJO 3: envío OK y marcado fallido → el claim previo evita repetir en el lease; repite acotado por intentos")
    void resumenEnviadoSinMarcarNoSeRepite() {
        Pago a = viejo();
        // Estado exacto que deja "correo salió y el UPDATE de marcado falló": claim vigente + intento, sin enviado_en.
        assertThat(aviso.reclamarResumen(List.of(a.getId()))).containsExactly(a.getId());

        aviso.barrer();
        aviso.barrer();
        verify(notificacionEmailService, never()).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());

        // Al vencer el lease se repite una vez (acotado)...
        vencerLease(a);
        aviso.barrer();
        verify(notificacionEmailService, times(1)).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());

        // ...y con el tope de intentos agotado no se repite más.
        Pago b = viejo();
        Pago enBd = enBase(b);
        enBd.setAvisoReembolsoAdminIntentos(5);
        pagoRepository.saveAndFlush(enBd);
        aviso.barrer();
        verify(notificacionEmailService, times(1)).enviarResumenReembolsosPendientesAAdminIT(any(), anyString());
    }

    @Test
    @DisplayName("#479 Cobro sobre grupo cancelado: exactamente 1 correo al admin IT (sin alerta de sobreventa extra)")
    void grupoCanceladoUnSoloCorreo() throws Exception {
        Pago pago = pagoSobreCancelado();
        webhook();
        verify(notificacionEmailService, ASYNC.times(1)).enviarAvisoReembolsoPendienteAAdminIT(
            eq(pago.getId()), anyString(), anyString(), any(),
            org.mockito.ArgumentMatchers.argThat(d -> d != null && d.monto() != null));
        verify(notificacionEmailService, after(500).never()).enviarAlertaSobreventaAAdminIT(any(), any(), any(), any());
        verify(notificacionEmailService, times(1)).enviarAvisoReembolsoPendienteAAdminIT(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("#479 BAJO: último intento fallido → [ALERTA-PAGO] 'intentos agotados' con solo el id")
    void intentosAgotadosDejaAlerta() {
        Pago p = pagoSobreCancelado();
        p.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        p.setAvisoReembolsoAdminIntentos(4);
        pagoRepository.saveAndFlush(p);
        org.mockito.Mockito.doThrow(new RuntimeException("smtp caído")).when(notificacionEmailService)
            .enviarAvisoReembolsoPendienteAAdminIT(any(), any(), any(), any(), any());
        ch.qos.logback.classic.Logger lg = (ch.qos.logback.classic.Logger)
            org.slf4j.LoggerFactory.getLogger(AvisoReembolsoPendienteService.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> ap = new ch.qos.logback.core.read.ListAppender<>();
        ap.start();
        lg.addAppender(ap);
        try {
            assertThat(aviso.avisar(p.getId())).isFalse();
            assertThat(enBase(p).getAvisoReembolsoAdminIntentos()).isEqualTo(5);
            assertThat(ap.list).anySatisfy(e -> {
                assertThat(e.getFormattedMessage()).isEqualTo(
                    "[ALERTA-PAGO] Aviso de reembolso pendiente: intentos agotados: pagoId=" + p.getId());
            });
        } finally {
            lg.detachAppender(ap);
        }
    }

    @Test
    @DisplayName("#479 BAJO 2: pago multi-pedido → el detalle lista todos los pedidos del grupo, sin PII")
    void detalleMultiPedidoListaTodos() {
        Pago pago = pagoSobreCancelado();
        Pedido principal = pedidoRepository.findById(pago.getPedido().getId()).orElseThrow();
        String grupo = "GRP-" + System.nanoTime();
        principal.setGrupoPago(grupo);
        principal.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedidoRepository.saveAndFlush(principal);
        Pago enBd = enBase(pago);
        enBd.setMerchantToken(SESION + "-1");
        pagoRepository.saveAndFlush(enBd);
        Pedido segundo = pagoSobreCancelado().getPedido();
        Pedido s2 = pedidoRepository.findById(segundo.getId()).orElseThrow();
        s2.setGrupoPago(grupo);
        s2.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedidoRepository.saveAndFlush(s2);

        com.hotclick.service.email.AvisoReembolsoDetalle d = aviso.detalleDe(pago.getId());

        assertThat(d).isNotNull();
        assertThat(d.pedidos()).isEqualTo(principal.getNumeroPedido() + "," + s2.getNumeroPedido());
        assertThat(d.pedidos()).doesNotContain("@");
    }
}
