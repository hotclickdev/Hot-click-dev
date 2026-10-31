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
            eq(pago.getId()), eq(Constants.PAGO_REEMBOLSO_PENDIENTE), org.mockito.ArgumentMatchers.endsWith("/plataforma/dinero/cobros"));
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
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
        assertThat(enBase(pago).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("BAJO #466: el webhook no espera el envío (afterCommit solo encola)")
    void webhookNoBloqueadoPorElEnvio() throws Exception {
        java.util.concurrent.CountDownLatch soltar = new java.util.concurrent.CountDownLatch(1);
        org.mockito.Mockito.doAnswer(inv -> { soltar.await(20, java.util.concurrent.TimeUnit.SECONDS); return null; })
            .when(notificacionEmailService).enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
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
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
        Pago pago = pagoSobreCancelado();

        webhook();

        verify(notificacionEmailService, ASYNC.times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
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
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
        Pago pago = pagoSobreCancelado();

        webhook();
        verify(notificacionEmailService, ASYNC.times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
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
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
    }

    @Test
    @DisplayName("BAJO #466: marca huérfana (claim sin envío) se recupera por barrido; sin claim también; lease vigente no")
    void barridoRecuperaHuerfanas() {
        Pago huerfana = reembolsoPendiente();
        vencerLease(huerfana);
        Pago vigente = reembolsoPendiente();
        Pago vig = enBase(vigente);
        vig.setAvisoReembolsoAdminEn(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        pagoRepository.saveAndFlush(vig);
        Pago sinClaim = reembolsoPendiente();

        assertThat(aviso.barrer()).isEqualTo(2);
        assertThat(enBase(huerfana).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
        assertThat(enBase(sinClaim).getAvisoReembolsoAdminEnviadoEn()).isNotNull();
        assertThat(enBase(vigente).getAvisoReembolsoAdminEnviadoEn()).isNull();
        verify(notificacionEmailService, never()).enviarAvisoReembolsoPendienteAAdminIT(eq(vigente.getId()), anyString(), anyString());
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
        verify(notificacionEmailService, never()).enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
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
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
    }

    @Test
    @DisplayName("Un pago que no está REEMBOLSO_PENDIENTE no dispara aviso")
    void soloReembolsoPendiente() {
        Pago pago = pagoSobreCancelado();
        assertThat(aviso.avisar(pago.getId())).isFalse();
        verify(notificacionEmailService, never())
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
    }
}
