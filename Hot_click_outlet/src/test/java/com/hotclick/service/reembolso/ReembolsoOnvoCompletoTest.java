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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
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
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
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
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));
        service.reembolsar(7L);
        assertThat(producto.getStockActual()).isEqualTo(1);
        assertThat(guardados).isEmpty();
    }

    @Test
    @DisplayName("Webhook refund.*: pending queda PENDIENTE; succeeded resuelve y repone")
    void webhookResuelvePendiente() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_3", "pending"));
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
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString());
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PREPARANDO);
    }

    @Test
    @DisplayName("BAJO Idempotency-Key: el POST lleva una clave estable del intento")
    void mandaIdempotencyKey() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_1", "pending"));
        service.reembolsar(7L);
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(onvo).crearReembolso(eq(INTENT), anyString(), key.capture());
        assertThat(key.getValue()).startsWith("hc-reembolso-pago-70-");
        LocalDateTime t = LocalDateTime.of(2026, 11, 4, 3, 0);
        assertThat(ReembolsoOnvoService.idempotencyKey(70L, t)).isEqualTo(ReembolsoOnvoService.idempotencyKey(70L, t));
    }

    @Test
    @DisplayName("BAJO GET fuera del lock: la sesión se lee antes del FOR UPDATE")
    void getAntesDelLock() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_1", "pending"));
        service.reembolsar(7L);
        InOrder orden = inOrder(onvo, pedidoRepository);
        orden.verify(onvo).obtenerCheckoutSession(SESION);
        orden.verify(pedidoRepository).findByIdForUpdate(7L);
        orden.verify(onvo).crearReembolso(eq(INTENT), anyString(), anyString());
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
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("BAJO restaurar(): failed en la reconsulta vuelve al estado previo real (PREPARANDO), no a PAGADO")
    void restaurarEstadoPrevioReal() {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_3", "pending"));
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
}
