package com.hotclick.service.reembolso;

import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.OnvoService.OnvoReembolso;
import com.hotclick.service.reembolso.ReembolsoOnvoService.ReembolsoException;
import com.hotclick.service.reembolso.ReembolsoOnvoService.WebhookResultado;
import com.hotclick.service.stock.StockMovimientoSupport;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Reembolso ONVO completo: stock una vez, webhook, 409 multi-paquete, Idempotency-Key, lock y estado previo")
class ReembolsoOnvoCompletoTest {

    private static final String SESION = "cs_test_sesion_fake";
    private static final String INTENT = "pi_test_intent_fake";

    private final PedidoRepository pedidoRepository = mock(PedidoRepository.class);
    private final PagoRepository pagoRepository = mock(PagoRepository.class);
    private final ProductoRepository productoRepository = mock(ProductoRepository.class);
    private final StockMovimientoSupport movimientos = mock(StockMovimientoSupport.class);
    private final OnvoService onvo = mock(OnvoService.class);
    private final PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
    private final List<MovimientoStock> guardados = new ArrayList<>();
    private ReembolsoOnvoService service;
    private Pedido pedido;
    private Pago pago;
    private Producto producto;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        producto = new Producto();
        producto.setId(5L);
        producto.setStockActual(1);
        producto.setStockReservado(0);
        PedidoItem item = new PedidoItem();
        item.setProducto(producto);
        item.setCantidad(2);
        pedido = new Pedido();
        pedido.setId(7L);
        pedido.setNumeroPedido("HC-7");
        pedido.setEstadoPedido(Constants.PEDIDO_PREPARANDO);
        pedido.setItems(new ArrayList<>(List.of(item)));
        pedido.setStockDescontadoEn(LocalDateTime.now());
        pago = new Pago();
        pago.setId(70L);
        pago.setPedido(pedido);
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMonto(15000);
        pago.setMerchantToken(SESION);
        when(pedidoRepository.findById(7L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(7L)).thenReturn(Optional.of(pago));
        when(pagoRepository.findById(70L)).thenReturn(Optional.of(pago));
        when(onvo.reembolsable(anyString())).thenReturn(true);
        doReturn(Map.of("id", SESION, "paymentIntentId", INTENT)).when(onvo).obtenerCheckoutSession(SESION);
        doReturn(intent("succeeded", 1_500_000)).when(onvo).obtenerPaymentIntent(INTENT);
        when(productoRepository.findAllByIdsForUpdate(anyList())).thenReturn(List.of(producto));
        when(movimientos.buildMovimiento(any(), anyString(), anyInt(), anyInt(), anyInt(), anyInt(), anyInt(), any(), any()))
            .thenAnswer(inv -> {
                MovimientoStock m = new MovimientoStock();
                m.setTipoMovimiento(inv.getArgument(1));
                m.setCantidad(inv.getArgument(2));
                return m;
            });
        doAnswer(inv -> { guardados.addAll((List<MovimientoStock>) inv.getArgument(0)); return null; })
            .when(movimientos).guardarLote(anyList());
        ReembolsoStockService stock = new ReembolsoStockService(productoRepository, movimientos);
        service = new ReembolsoOnvoService(pedidoRepository, pagoRepository, onvo, stock, txManager);
    }

    @Test
    @DisplayName("succeeded repone stock con un movimiento DEVOLUCION que referencia al pedido")
    void reponeStockConMovimiento() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
        service.reembolsar(7L);
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(guardados).hasSize(1);
        MovimientoStock m = guardados.get(0);
        assertThat(m.getTipoMovimiento()).isEqualTo(MovimientoStock.DEVOLUCION);
        assertThat(m.getCantidad()).isEqualTo(2);
        assertThat(m.getReferenciaId()).isEqualTo(7L);
        assertThat(pedido.getStockRepuestoEn()).isNotNull();
    }

    @Test
    @DisplayName("Reponer es idempotente: un webhook tardío del mismo refund no repone dos veces")
    void reponerUnaSolaVez() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
        service.reembolsar(7L);
        when(pagoRepository.findByOnvoReembolsoId("rf_test_1")).thenReturn(Optional.of(pago));
        when(onvo.obtenerReembolso("rf_test_1")).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
        assertThat(service.resolverPorWebhook("rf_test_1")).isEqualTo(WebhookResultado.YA_RESUELTO);
        ReembolsoStockService stock = new ReembolsoStockService(productoRepository, movimientos);
        assertThat(stock.reponerSiCorresponde(this, pedido, "x")).isFalse();
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(guardados).hasSize(1);
    }

    @Test
    @DisplayName("Pedido que nunca consumió stock: no repone")
    void sinDescuentoNoRepone() {
        pedido.setStockDescontadoEn(null);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
        service.reembolsar(7L);
        assertThat(producto.getStockActual()).isEqualTo(1);
        assertThat(guardados).isEmpty();
    }

    @Test
    @DisplayName("Webhook refund.*: pending queda PENDIENTE; succeeded resuelve y repone")
    void webhookResuelvePendiente() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_3", "pending"));
        service.reembolsar(7L);
        when(pagoRepository.findByOnvoReembolsoId("rf_test_3")).thenReturn(Optional.of(pago));
        when(onvo.obtenerReembolso("rf_test_3")).thenReturn(new OnvoReembolso("rf_test_3", "pending"));
        assertThat(service.resolverPorWebhook("rf_test_3")).isEqualTo(WebhookResultado.PENDIENTE);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);

        when(onvo.obtenerReembolso("rf_test_3")).thenReturn(new OnvoReembolso("rf_test_3", "succeeded"));
        assertThat(service.resolverPorWebhook("rf_test_3")).isEqualTo(WebhookResultado.RESUELTO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(producto.getStockActual()).isEqualTo(3);
    }

    @Test
    @DisplayName("Webhook con refund desconocido o sin ONVO: no toca nada (fail-closed)")
    void webhookFailClosed() {
        when(pagoRepository.findByOnvoReembolsoId("rf_test_x")).thenReturn(Optional.empty());
        assertThat(service.resolverPorWebhook("rf_test_x")).isEqualTo(WebhookResultado.NO_ENCONTRADO);
        when(onvo.reembolsable("rf_test_y")).thenReturn(false);
        assertThat(service.resolverPorWebhook("rf_test_y")).isEqualTo(WebhookResultado.NO_CONSULTABLE);
        verify(onvo, never()).obtenerReembolso(anyString());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("Webhook: el id que devuelve el GET debe coincidir")
    void webhookIdDistinto() {
        pago.setOnvoReembolsoId("rf_test_4");
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        when(pagoRepository.findByOnvoReembolsoId("rf_test_4")).thenReturn(Optional.of(pago));
        when(onvo.obtenerReembolso("rf_test_4")).thenReturn(new OnvoReembolso("rf_test_otro", "succeeded"));
        assertThat(service.resolverPorWebhook("rf_test_4")).isEqualTo(WebhookResultado.NO_CONSULTABLE);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("Pago compartido por varios paquetes → 409 sin llamar a ONVO para reembolsar")
    void variosPaquetes409() {
        com.hotclick.model.Compra compra = new com.hotclick.model.Compra();
        compra.setId(99L);
        pedido.setCompra(compra);
        Pedido otro = new Pedido();
        otro.setId(8L);
        when(pedidoRepository.findByCompra_IdOrderByNumeroPaqueteAsc(99L)).thenReturn(Arrays.asList(pedido, otro));
        assertThatThrownBy(() -> service.reembolsar(7L))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> {
                assertThat(e.getStatus()).isEqualTo(409);
                assertThat(e.getMessage()).isEqualTo(ReembolsoOnvoService.MSG_VARIOS_PAQUETES);
            });
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PREPARANDO);
    }

    @Test
    @DisplayName("BAJO Idempotency-Key: el POST lleva una clave estable del intento")
    void mandaIdempotencyKey() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_1", "pending"));
        service.reembolsar(7L);
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(onvo).crearReembolso(eq(INTENT), anyString(), key.capture(), eq(1_500_000L));
        assertThat(key.getValue()).startsWith("hc-reembolso-pago-70-");
        LocalDateTime t = LocalDateTime.of(2026, 11, 4, 3, 0);
        assertThat(ReembolsoOnvoService.idempotencyKey(70L, t)).isEqualTo(ReembolsoOnvoService.idempotencyKey(70L, t));
    }

    @Test
    @DisplayName("BAJO GET fuera del lock: la sesión se lee antes del FOR UPDATE")
    void getAntesDelLock() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_1", "pending"));
        service.reembolsar(7L);
        InOrder orden = inOrder(onvo, pedidoRepository);
        orden.verify(onvo).obtenerCheckoutSession(SESION);
        orden.verify(pedidoRepository).findByIdForUpdate(7L);
        orden.verify(onvo).crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L));
    }

    @Test
    @DisplayName("BAJO GET fuera del lock: si el merchantToken cambió entre la lectura y el lock → 409 sin reembolsar")
    void tokenCambiaEntreLecturaYLock() {
        doAnswer(inv -> { pago.setMerchantToken("cs_test_otra_sesion"); return Map.of("id", SESION, "paymentIntentId", INTENT); })
            .when(onvo).obtenerCheckoutSession(SESION);
        assertThatThrownBy(() -> service.reembolsar(7L))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> {
                assertThat(e.getStatus()).isEqualTo(409);
                assertThat(e.getMessage()).isEqualTo(ReembolsoOnvoService.MSG_CAMBIO);
            });
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("BAJO restaurar(): failed en la reconsulta vuelve al estado previo real (PREPARANDO), no a PAGADO")
    void restaurarEstadoPrevioReal() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_3", "pending"));
        service.reembolsar(7L);
        when(onvo.obtenerReembolso("rf_test_3")).thenReturn(new OnvoReembolso("rf_test_3", "failed"));
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOf(ReembolsoException.class);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PREPARANDO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pago.getReembolsoEstadoPedidoPrevio()).isNull();
    }

    @Test
    @DisplayName("BAJO restaurar(): sin estado previo guardado no inventa uno; queda REEMBOLSO_PENDIENTE")
    void sinEstadoPrevioNoInventa() {
        pedido.setEstadoPedido(Constants.PEDIDO_REEMBOLSO_PENDIENTE);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setOnvoReembolsoId("rf_test_5");
        when(onvo.obtenerReembolso("rf_test_5")).thenReturn(new OnvoReembolso("rf_test_5", "failed"));
        assertThatThrownBy(() -> service.reembolsar(7L))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> assertThat(e.getMessage()).isEqualTo(ReembolsoOnvoService.MSG_EN_DUDA));
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("BAJO enmascarado unificado: sin helpers propios, solo OnvoService.enmascarar")
    void enmascaradoUnificado() throws Exception {
        String svc = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/java/com/hotclick/service/reembolso/ReembolsoOnvoService.java"));
        String onvoSrc = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/java/com/hotclick/service/OnvoService.java"));
        assertThat(svc).doesNotContain("ocultar(").contains("OnvoService.enmascarar(");
        assertThat(onvoSrc).doesNotContain("ReembolsoIds");
        assertThat(Arrays.stream(ReembolsoOnvoService.class.getDeclaredMethods()).map(java.lang.reflect.Method::getName))
            .doesNotContain("ocultar");
    }

    @Test
    @DisplayName("MEDIO: pedido CANCELADO con pago CAPTURADO se reembolsa; el pedido sigue CANCELADO")
    void canceladoCapturadoSeReembolsa() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenAnswer(inv -> {
            assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
            assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
            return new OnvoReembolso("rf_test_c", "succeeded");
        });
        ReembolsoOnvoService.Resultado r = service.reembolsar(7L);
        assertThat(r.status()).isEqualTo(200);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(producto.getStockActual()).isEqualTo(3);
    }

    @Test
    @DisplayName("MEDIO: CANCELADO rechazado por ONVO vuelve a CANCELADO + CAPTURADO")
    void canceladoRechazoRestaura() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_c", "failed"));
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOf(ReembolsoException.class);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("MEDIO: si el stock ya se repuso al cancelar (DEVOLUCION del pedido), no se duplica")
    void canceladoNoDuplicaStock() {
        com.hotclick.repository.MovimientoStockRepository repo = mock(com.hotclick.repository.MovimientoStockRepository.class);
        when(repo.existsByTipoMovimientoAndReferenciaTipoAndReferenciaId(MovimientoStock.DEVOLUCION, "PEDIDO", 7L)).thenReturn(true);
        service = new ReembolsoOnvoService(pedidoRepository, pagoRepository, onvo,
            new ReembolsoStockService(productoRepository, movimientos, repo), txManager);
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_c", "succeeded"));
        service.reembolsar(7L);
        assertThat(producto.getStockActual()).isEqualTo(1);
        assertThat(guardados).isEmpty();
        assertThat(pedido.getStockRepuestoEn()).isNotNull();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
    }

    @Test
    @DisplayName("REEMBOLSO_PENDIENTE sin id: 409 con 'Revisá en ONVO' y NO vuelve a llamar a /refunds")
    void pendienteSinIdNoReintenta() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L)))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("timeout"));
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class,
            e -> assertThat(e.getMessage()).isEqualTo(ReembolsoOnvoService.MSG_EN_DUDA));
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pago.getOnvoReembolsoId()).isNull();

        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class, e -> {
            assertThat(e.getStatus()).isEqualTo(409);
            assertThat(e.getMessage()).contains(ReembolsoOnvoService.MSG_REVISAR);
        });
        verify(onvo, times(1)).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        verify(onvo, never()).obtenerReembolso(anyString());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("Con id de refund el reintento es solo una reconsulta por GET, sin POST ni Idempotency-Key")
    void conIdSoloReconsulta() {
        pedido.setEstadoPedido(Constants.PEDIDO_REEMBOLSO_PENDIENTE);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setOnvoReembolsoId("rf_test_g");
        when(onvo.obtenerReembolso("rf_test_g")).thenReturn(new OnvoReembolso("rf_test_g", "succeeded"));
        assertThat(service.reembolsar(7L).status()).isEqualTo(200);
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
    }

    private void dejarPendienteSinId() {
        pedido.setEstadoPedido(Constants.PEDIDO_REEMBOLSO_PENDIENTE);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setReembolsoEstadoPedidoPrevio(Constants.PEDIDO_PREPARANDO);
        pago.setReembolsoEstadoPagoPrevio(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("Resolución manual DEVUELTO sin confirmación explícita: 400 y no cambia nada")
    void manualDevueltoExigeConfirmacion() {
        dejarPendienteSinId();
        assertThatThrownBy(() -> service.resolverManual(7L, ReembolsoOnvoService.ResolucionManual.DEVUELTO, false, "admin@test"))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> assertThat(e.getStatus()).isEqualTo(400));
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pago.getReembolsoResueltoPor()).isNull();
    }

    @Test
    @DisplayName("Resolución manual DEVUELTO confirmada: REEMBOLSADO, CANCELADO, stock una vez y registra quién y cuándo")
    void manualDevueltoConfirmado() {
        dejarPendienteSinId();
        ReembolsoOnvoService.Resultado r = service.resolverManual(7L, ReembolsoOnvoService.ResolucionManual.DEVUELTO, true, "admin@test");
        assertThat(r.status()).isEqualTo(200);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(pago.getReembolsoResueltoPor()).isEqualTo("admin@test");
        assertThat(pago.getReembolsoResueltoEn()).isNotNull();
        assertThat(pago.getReembolsoResolucion()).isEqualTo("DEVUELTO");
        verifyNoInteractions(onvo);
    }

    @Test
    @DisplayName("Resolución manual NO_DEVUELTO: vuelve al estado previo real y registra quién y cuándo")
    void manualNoDevuelto() {
        dejarPendienteSinId();
        service.resolverManual(7L, ReembolsoOnvoService.ResolucionManual.NO_DEVUELTO, false, "admin@test");
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PREPARANDO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pago.getReembolsoResolucion()).isEqualTo("NO_DEVUELTO");
        assertThat(producto.getStockActual()).isEqualTo(1);
    }

    @Test
    @DisplayName("Resolución manual sin reembolso pendiente: 409")
    void manualSinPendiente409() {
        assertThatThrownBy(() -> service.resolverManual(7L, ReembolsoOnvoService.ResolucionManual.NO_DEVUELTO, false, "admin@test"))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> assertThat(e.getStatus()).isEqualTo(409));
    }

    @Test
    @DisplayName("REEMBOLSO_PENDIENTE sin id y sin refund en ONVO: el admin pide el primero")
    void pendienteSinIdSinRefundPermiteElPrimero() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setOnvoReembolsoId(null);
        pago.setReembolsoIdempotencyKey(null);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L)))
            .thenReturn(new OnvoReembolso("rf_qa", "succeeded"));
        assertThat(service.reembolsar(7L).status()).isEqualTo(200);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(pago.getOnvoReembolsoId()).isEqualTo("rf_qa");
        assertThat(pago.getReembolsoIdempotencyKey()).startsWith("hc-reembolso-pago-70-");
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(guardados).hasSize(1);
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOf(ReembolsoException.class)
            .hasMessage(ReembolsoOnvoService.MSG_YA_REEMBOLSADO);
        verify(onvo, times(1)).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        assertThat(guardados).hasSize(1);
    }

    @Test
    @DisplayName("REEMBOLSO_PENDIENTE sin id y ONVO ya reembolsó: no se crea otro refund")
    void pendienteConRefundEnOnvoNoDuplica() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        doReturn(intentDevuelto(1_500_000)).when(onvo).obtenerPaymentIntent(INTENT);
        assertThat(service.reembolsar(7L).status()).isEqualTo(200);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(guardados).hasSize(1);
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOf(ReembolsoException.class)
            .hasMessage(ReembolsoOnvoService.MSG_YA_REEMBOLSADO);
        assertThat(guardados).hasSize(1);
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("REEMBOLSO_PENDIENTE sin id y reembolso parcial en ONVO: no se pide otro")
    void pendienteConReembolsoParcialNoDuplica() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        doReturn(intent("partially_refunded", 1_500_000)).when(onvo).obtenerPaymentIntent(INTENT);
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class, e -> {
            assertThat(e.getStatus()).isEqualTo(409);
            assertThat(e.getMessage()).isEqualTo(ReembolsoOnvoService.MSG_YA_HAY_REFUND);
        });
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOf(ReembolsoException.class);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(producto.getStockActual()).isEqualTo(1);
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("BAJO Seguridad: webhook refund failed sin estado previo queda PENDIENTE (409, ONVO reintenta)")
    void webhookFailedSinEstadoPrevioEsPendiente() {
        pedido.setEstadoPedido(Constants.PEDIDO_REEMBOLSO_PENDIENTE);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setOnvoReembolsoId("rf_test_6a");
        when(pagoRepository.findByOnvoReembolsoId("rf_test_6a")).thenReturn(Optional.of(pago));
        when(onvo.obtenerReembolso("rf_test_6a")).thenReturn(new OnvoReembolso("rf_test_6a", "failed"));
        assertThat(service.resolverPorWebhook("rf_test_6a")).isEqualTo(WebhookResultado.PENDIENTE);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("Webhook refund failed con estado previo: restaura y queda RESUELTO")
    void webhookFailedConEstadoPrevioResuelve() {
        dejarPendienteSinId();
        pago.setOnvoReembolsoId("rf_test_6a2");
        when(pagoRepository.findByOnvoReembolsoId("rf_test_6a2")).thenReturn(Optional.of(pago));
        when(onvo.obtenerReembolso("rf_test_6a2")).thenReturn(new OnvoReembolso("rf_test_6a2", "failed"));
        assertThat(service.resolverPorWebhook("rf_test_6a2")).isEqualTo(WebhookResultado.RESUELTO);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("BAJO Seguridad: DEVUELTO manual se bloquea si ONVO dice que el refund falló")
    void manualDevueltoBloqueadoSiOnvoDiceFailed() {
        dejarPendienteSinId();
        pago.setOnvoReembolsoId("rf_test_6b");
        when(onvo.obtenerReembolso("rf_test_6b")).thenReturn(new OnvoReembolso("rf_test_6b", "failed"));
        assertThatThrownBy(() -> service.resolverManual(7L, ReembolsoOnvoService.ResolucionManual.DEVUELTO, true, "admin@test"))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> {
                assertThat(e.getStatus()).isEqualTo(409);
                assertThat(e.getMessage()).isEqualTo(ReembolsoOnvoService.MSG_MANUAL_ONVO_NO_DEVUELTO);
            });
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pago.getReembolsoResueltoPor()).isNull();
        assertThat(producto.getStockActual()).isEqualTo(1);
    }

    @Test
    @DisplayName("BAJO Seguridad: DEVUELTO manual es best-effort: si ONVO no responde o dice pending, manda el admin")
    void manualDevueltoBestEffort() {
        dejarPendienteSinId();
        pago.setOnvoReembolsoId("rf_test_6b2");
        when(onvo.obtenerReembolso("rf_test_6b2")).thenThrow(new RuntimeException("timeout"));
        assertThat(service.resolverManual(7L, ReembolsoOnvoService.ResolucionManual.DEVUELTO, true, "admin@test").status())
            .isEqualTo(200);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
    }

    @Test
    @DisplayName("BAJO 7: repetir el reembolso de un pago REEMBOLSADO → 409 'ya fue reembolsado', sin otro POST")
    void repetirReembolsoYaReembolsado() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L))).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
        service.reembolsar(7L);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThatThrownBy(() -> service.reembolsar(7L))
            .isInstanceOf(ReembolsoException.class)
            .hasMessage(ReembolsoOnvoService.MSG_YA_REEMBOLSADO)
            .satisfies(e -> assertThat(((ReembolsoException) e).getStatus()).isEqualTo(409));
        verify(onvo, times(1)).crearReembolso(eq(INTENT), anyString(), anyString(), eq(1_500_000L));
    }

    @Test
    @DisplayName("CANCELADO y 9000 CRC: el POST lleva 900000 céntimos y el kardex se escribe una sola vez")
    void canceladoNueveMilEnCentimos() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setMonto(9000);
        doReturn(intent("succeeded", 900_000)).when(onvo).obtenerPaymentIntent(INTENT);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(900_000L)))
            .thenReturn(new OnvoReembolso("rf_34", "succeeded"));
        assertThat(service.reembolsar(7L).status()).isEqualTo(200);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(guardados).hasSize(1);
        verify(onvo, never()).cancelarPaymentIntent(anyString());
    }

    @Test
    @DisplayName("already_payed con el intent aún succeeded y receivedAmount intacto: no se devuelve y no se repite el POST")
    void alreadyPayedConCobroIntactoNoRepite() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setMonto(9000);
        Map<String, Object> capturado = intent("succeeded", 900_000);
        capturado.put("receivedAmount", 900_000);
        doReturn(capturado).when(onvo).obtenerPaymentIntent(INTENT);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(900_000L)))
            .thenThrow(rechazoYaPagado());
        assertThatThrownBy(() -> service.reembolsar(7L))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> {
                assertThat(e.getStatus()).isEqualTo(422);
                assertThat(e.getMessage()).isEqualTo(ReembolsoOnvoService.MSG_ONVO_NO_DEVUELVE);
            });
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pago.getReembolsoError()).contains(ReembolsoOnvoService.CODIGO_YA_PAGADO);
        assertThat(producto.getStockActual()).isEqualTo(1);
        assertThat(guardados).isEmpty();
        assertThat(pago.getMontoReembolsado()).isNull();

        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class,
            e -> assertThat(e.getStatus()).isEqualTo(409));
        verify(onvo, times(1)).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        verify(onvo, never()).cancelarPaymentIntent(anyString());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("already_payed pero el intent ya está refunded: se confirma una vez, sin segundo POST ni doble kardex")
    void alreadyPayedConIntentRefundedConfirmaUnaVez() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setMonto(9000);
        doReturn(intent("succeeded", 900_000), intentDevuelto(900_000)).when(onvo).obtenerPaymentIntent(INTENT);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(900_000L))).thenThrow(rechazoYaPagado());
        assertThat(service.reembolsar(7L).status()).isEqualTo(200);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(guardados).hasSize(1);
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOf(ReembolsoException.class)
            .hasMessage(ReembolsoOnvoService.MSG_YA_REEMBOLSADO);
        assertThat(guardados).hasSize(1);
        verify(onvo, times(1)).crearReembolso(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Intent que no está succeeded: no se cancela ni se pide refund")
    void intentNoSucceededNoCancela() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        doReturn(intent("requires_capture", 1_500_000)).when(onvo).obtenerPaymentIntent(INTENT);
        assertThatThrownBy(() -> service.reembolsar(7L))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> assertThat(e.getMessage()).contains("requires_capture"));
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(producto.getStockActual()).isEqualTo(1);
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        verify(onvo, never()).cancelarPaymentIntent(anyString());
    }

    @Test
    @DisplayName("Monto del intent distinto: no se pide el refund")
    void montoDistintoNoPide() {
        doReturn(intent("succeeded", 100)).when(onvo).obtenerPaymentIntent(INTENT);
        assertThatThrownBy(() -> service.reembolsar(7L))
            .isInstanceOfSatisfying(ReembolsoException.class, e -> assertThat(e.getMessage()).contains("céntimos"));
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(producto.getStockActual()).isEqualTo(1);
    }

    @Test
    @DisplayName("4xx y después un timeout: el siguiente intento no manda otro POST")
    void cuatroXxSeguidoDeTimeoutNoRepitePost() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setMonto(9000);
        doReturn(intent("succeeded", 900_000)).when(onvo).obtenerPaymentIntent(INTENT);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(900_000L)))
            .thenThrow(rechazoGenerico())
            .thenThrow(new ResourceAccessException("timeout"));

        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class,
            e -> assertThat(e.getStatus()).isEqualTo(422));
        assertThat(pago.getReembolsoError()).contains("amount must be positive");

        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class,
            e -> assertThat(e.getStatus()).isEqualTo(502));
        assertThat(pago.getReembolsoError()).isEqualTo(ReembolsoOnvoService.MARCA_EN_VUELO);

        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class,
            e -> assertThat(e.getStatus()).isEqualTo(409));
        verify(onvo, times(2)).crearReembolso(anyString(), anyString(), anyString(), anyLong());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pago.getMontoReembolsado()).isNull();
        assertThat(producto.getStockActual()).isEqualTo(1);
    }

    @Test
    @DisplayName("Dos admins a la vez después de un 4xx: un solo POST")
    void dosAdminsDespuesDe4xxUnSoloPost() throws Exception {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setMonto(9000);
        doReturn(intent("succeeded", 900_000)).when(onvo).obtenerPaymentIntent(INTENT);
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(900_000L)))
            .thenThrow(rechazoGenerico());
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOf(ReembolsoException.class);

        CountDownLatch adentro = new CountDownLatch(1);
        CountDownLatch soltar = new CountDownLatch(1);
        AtomicInteger posts = new AtomicInteger();
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString(), eq(900_000L))).thenAnswer(inv -> {
            posts.incrementAndGet();
            adentro.countDown();
            if (!soltar.await(5, TimeUnit.SECONDS)) {
                throw new ResourceAccessException("timeout");
            }
            throw new ResourceAccessException("timeout");
        });
        simularLockDeFila();
        AtomicReference<String> falloUno = new AtomicReference<>();
        AtomicReference<String> falloDos = new AtomicReference<>();
        Thread uno = new Thread(() -> correr(falloUno));
        Thread dos = new Thread(() -> correr(falloDos));
        uno.start();
        dos.start();
        try {
            assertThat(adentro.await(5, TimeUnit.SECONDS)).isTrue();
            long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (uno.isAlive() && dos.isAlive() && System.nanoTime() < limite) {
                Thread.onSpinWait();
            }
            assertThat(posts.get()).isEqualTo(1);
            assertThat(uno.isAlive() ^ dos.isAlive()).isTrue();
        } finally {
            soltar.countDown();
            uno.join(5000);
            dos.join(5000);
        }
        assertThat(posts.get()).isEqualTo(1);
        assertThat(pago.getEstadoPago()).isNotEqualTo(Constants.PAGO_REEMBOLSADO);
        assertThat(List.of(falloUno.get(), falloDos.get()))
            .contains(ReembolsoOnvoService.MSG_EN_DUDA_PREVIO, ReembolsoOnvoService.MSG_EN_DUDA);
    }

    private void correr(AtomicReference<String> fallo) {
        try {
            service.reembolsar(7L);
        } catch (RuntimeException e) {
            fallo.set(e.getMessage());
        }
    }

    @Test
    @DisplayName("Intent refunded con otro monto: no se marca REEMBOLSADO ni se pide otro POST")
    void refundedConOtroMontoNoConfirma() {
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        Map<String, Object> otro = intent("refunded", 100);
        otro.put("receivedAmount", 0);
        doReturn(otro).when(onvo).obtenerPaymentIntent(INTENT);
        assertThatThrownBy(() -> service.reembolsar(7L)).isInstanceOfSatisfying(ReembolsoException.class,
            e -> assertThat(e.getStatus()).isEqualTo(409));
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pago.getMontoReembolsado()).isNull();
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString(), anyLong());
    }

    private void simularLockDeFila() {
        ReentrantLock fila = new ReentrantLock(true);
        when(txManager.getTransaction(any())).thenAnswer(inv -> {
            fila.lock();
            return new org.springframework.transaction.support.SimpleTransactionStatus();
        });
        org.mockito.stubbing.Answer<Object> soltar = inv -> {
            fila.unlock();
            return null;
        };
        doAnswer(soltar).when(txManager).commit(any());
        doAnswer(soltar).when(txManager).rollback(any());
    }

    private static Map<String, Object> intent(String status, int amount) {
        java.util.HashMap<String, Object> mapa = new java.util.HashMap<>();
        mapa.put("id", INTENT);
        mapa.put("status", status);
        mapa.put("amount", amount);
        mapa.put("currency", "CRC");
        return mapa;
    }

    /** status refunded y receivedAmount 0: ONVO ya devolvió todo el amount. */
    private static Map<String, Object> intentDevuelto(int amount) {
        Map<String, Object> mapa = intent("refunded", amount);
        mapa.put("receivedAmount", 0);
        return mapa;
    }

    private static HttpClientErrorException rechazoYaPagado() {
        String body = "{\"code\":\"refunds.payment_intent_already_payed\",\"message\":\"Payment intent already payed\"}";
        return HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", null, body.getBytes(), null);
    }

    private static HttpClientErrorException rechazoGenerico() {
        String body = "{\"message\":[\"amount must be positive\"],\"error\":\"Bad Request\"}";
        return HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", null, body.getBytes(), null);
    }
}
