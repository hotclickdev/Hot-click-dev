package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.*;
import com.hotclick.payment.PaymentProvider;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.*;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.service.payment.*;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PaymentService — unit tests (stock, checkout, confirm, cancel)")
class PaymentServiceTest {

    @Mock private PaymentProviderFactory    providerFactory;
    @Mock private PedidoRepository          pedidoRepository;
    @Mock private ProductoRepository        productoRepository;
    @Mock private BodegaRepository          bodegaRepository;
    @Mock private UsuarioRepository         usuarioRepository;
    @Mock private RolRepository             rolRepository;
    @Mock private PagoRepository            pagoRepository;
    @Mock private TransaccionPagoRepository transaccionPagoRepository;
    @Mock private EmpresaRepository         empresaRepository;
    @Mock private NotificacionEmailService  notificacionEmailService;
    @Mock private VentaAvisoService         ventaAvisoService;
    @Mock private N8nWebhookService         n8nWebhookService;
    @Mock private AggregatorService         aggregatorService;
    @Mock private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock private CuponService              cuponService;
    @Mock private GiftCardService           giftCardService;
    @Mock private WebhookDispatcherService  webhookDispatcher;
    @Mock private PaymentProvider           mockProvider;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private PosQrVentaService          posQrVentaService;
    @Mock private EncargoService             encargoService;

    @InjectMocks private CheckoutValidator              checkoutValidator;
    @InjectMocks private GuestUserResolver              guestUserResolver;
    @InjectMocks private StockReservationService        stockReservationService;
    @InjectMocks private OrderPricingService            orderPricingService;
    @InjectMocks private CheckoutOrderFactory           checkoutOrderFactory;
    @InjectMocks private PaymentRecordFactory           paymentRecordFactory;
    @InjectMocks private PaymentStatusAssembler         paymentStatusAssembler;
    @InjectMocks private PaymentNotificationsFacade     paymentNotificationsFacade;
    @InjectMocks private PaymentExpirationCleanupService paymentExpirationCleanupService;
    @InjectMocks private PaymentOrderConfirmationService orderConfirmationService;
    @InjectMocks private PaymentFailureHandler            paymentFailureHandler;
    @InjectMocks private PaymentUserCancellationService   userCancellationService;
    @InjectMocks private SinpePaymentAdminService         sinpePaymentAdminService;

    private PaymentService service;

    private Usuario  testUser;
    private Bodega   testBodega;
    private Producto testProducto;

    private static final String CORREO  = "buyer@hotclick.cr";
    private static final String REDIRECT = "https://checkout.stripe.com/pay/TXN-123";

    @BeforeEach
    void setUp() throws Exception {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setCorreo(CORREO);

        testBodega = new Bodega();
        testBodega.setId(1L);
        testBodega.setNombreBodega("Bodega Central");
        testBodega.setPermiteRetiroCliente(true);

        testProducto = new Producto();
        testProducto.setId(10L);
        testProducto.setNombreProducto("Audífonos Pro");
        testProducto.setPrecioVenta(25000);
        testProducto.setPrecioCompra(15000);
        testProducto.setStockActual(10);
        testProducto.setStockReservado(0);
        testProducto.setVisibleCatalogo(true);
        testProducto.setVendido(false);
        testProducto.setEstado(Constants.ESTADO_ACTIVO);
        testProducto.setBodega(testBodega);

        when(providerFactory.soporta("STRIPE")).thenReturn(true);
        when(providerFactory.get("STRIPE")).thenReturn(mockProvider);
        when(mockProvider.crearSesion(any(), any()))
            .thenReturn(new PaymentSession("TXN-123", REDIRECT));

        service = new PaymentService();
        ReflectionTestUtils.setField(service, "providerFactory", providerFactory);
        ReflectionTestUtils.setField(service, "pedidoRepository", pedidoRepository);
        ReflectionTestUtils.setField(service, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(service, "giftCardService", giftCardService);
        ReflectionTestUtils.setField(service, "eventPublisher", eventPublisher);
        ReflectionTestUtils.setField(service, "checkoutValidator", checkoutValidator);
        ReflectionTestUtils.setField(service, "guestUserResolver", guestUserResolver);
        ReflectionTestUtils.setField(service, "stockReservationService", stockReservationService);
        ReflectionTestUtils.setField(service, "orderPricingService", orderPricingService);
        ReflectionTestUtils.setField(service, "checkoutOrderFactory", checkoutOrderFactory);
        ReflectionTestUtils.setField(service, "paymentRecordFactory", paymentRecordFactory);
        ReflectionTestUtils.setField(service, "paymentStatusAssembler", paymentStatusAssembler);
        ReflectionTestUtils.setField(service, "paymentNotificationsFacade", paymentNotificationsFacade);
        ReflectionTestUtils.setField(service, "orderConfirmationService", orderConfirmationService);
        ReflectionTestUtils.setField(service, "paymentFailureHandler", paymentFailureHandler);
        ReflectionTestUtils.setField(service, "userCancellationService", userCancellationService);
        ReflectionTestUtils.setField(service, "sinpePaymentAdminService", sinpePaymentAdminService);
        ReflectionTestUtils.setField(service, "posQrVentaService", posQrVentaService);
        ReflectionTestUtils.setField(checkoutOrderFactory, "encargoService", encargoService);
        ReflectionTestUtils.setField(orderConfirmationService, "encargoService", encargoService);
        ReflectionTestUtils.setField(orderConfirmationService, "posQrVentaService", posQrVentaService);
        ReflectionTestUtils.setField(orderConfirmationService, "pedidoRepository", pedidoRepository);
        ReflectionTestUtils.setField(orderConfirmationService, "cuponService", cuponService);
        ReflectionTestUtils.setField(orderConfirmationService, "giftCardService", giftCardService);
        ReflectionTestUtils.setField(orderConfirmationService, "stockReservationService", stockReservationService);
        ReflectionTestUtils.setField(orderConfirmationService, "paymentNotificationsFacade", paymentNotificationsFacade);
        ReflectionTestUtils.setField(paymentFailureHandler, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(paymentFailureHandler, "pedidoRepository", pedidoRepository);
        ReflectionTestUtils.setField(paymentFailureHandler, "stockReservationService", stockReservationService);
        ReflectionTestUtils.setField(paymentFailureHandler, "paymentNotificationsFacade", paymentNotificationsFacade);
        ReflectionTestUtils.setField(userCancellationService, "pedidoRepository", pedidoRepository);
        ReflectionTestUtils.setField(userCancellationService, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(userCancellationService, "paymentFailureHandler", paymentFailureHandler);
        ReflectionTestUtils.setField(sinpePaymentAdminService, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(sinpePaymentAdminService, "orderConfirmationService", orderConfirmationService);
        ReflectionTestUtils.setField(sinpePaymentAdminService, "paymentFailureHandler", paymentFailureHandler);
        ReflectionTestUtils.setField(sinpePaymentAdminService, "paymentStatusAssembler", paymentStatusAssembler);
        ReflectionTestUtils.setField(paymentExpirationCleanupService, "stockReservationService", stockReservationService);
    }

    // ── checkout — camino feliz ───────────────────────────────────────────────

    @Test
    @DisplayName("checkout → reserva stock y crea Pago con redirectUrl")
    void checkout_happyPath_reservesStockAndCreatesPago() throws Exception {
        setupCheckoutMocks();

        PaymentCheckoutResponse resp = service.checkout(buildRequest(1), CORREO);

        // Stock fue reservado (stockReservado +1)
        ArgumentCaptor<Producto> prodCaptor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository, atLeastOnce()).save(prodCaptor.capture());
        assertThat(prodCaptor.getAllValues())
            .anyMatch(p -> p.getStockReservado() == 1);

        verify(pagoRepository).save(any(Pago.class));
        assertThat(resp.getRedirectUrl()).isEqualTo(REDIRECT);
        assertThat(resp.getNumeroPedido()).startsWith("ORD-");
        assertThat(resp.getTotal()).isEqualTo(25000); // RETIRO_EN_TIENDA → sin envío
    }

    @Test
    @DisplayName("checkout → ENVIO_A_DOMICILIO suma ₡2000 al total")
    void checkout_envioADomicilio_addsCostoEnvio() throws Exception {
        setupCheckoutMocks();

        PaymentCheckoutRequest req = buildRequest(1);
        req.setMetodoEnvio(Constants.ENVIO_DOMICILIO);

        PaymentCheckoutResponse resp = service.checkout(req, CORREO);

        assertThat(resp.getTotal()).isEqualTo(25000 + 2000);
    }

    @Test
    @DisplayName("checkout → múltiples unidades se reservan correctamente")
    void checkout_multipleQuantity_reservesCorrectAmount() throws Exception {
        setupCheckoutMocks();

        PaymentCheckoutResponse resp = service.checkout(buildRequest(3), CORREO);

        ArgumentCaptor<Producto> captor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository, atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues()).anyMatch(p -> p.getStockReservado() == 3);

        assertThat(resp.getTotal()).isEqualTo(25000 * 3);
    }

    // ── checkout — errores de stock ───────────────────────────────────────────

    @Test
    @DisplayName("checkout → stock insuficiente lanza StockInsuficienteException")
    void checkout_insufficientStock_throws() {
        testProducto.setStockActual(5);
        testProducto.setStockReservado(4); // disponible = 1

        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));

        assertThatThrownBy(() -> service.checkout(buildRequest(3), CORREO))
            .isInstanceOf(StockInsuficienteException.class)
            .hasMessageContaining("Stock insuficiente");
    }

    @Test
    @DisplayName("checkout → producto no encontrado lanza RuntimeException")
    void checkout_productNotFound_throws() {
        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.checkout(buildRequest(1), CORREO))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Producto no encontrado");
    }

    @Test
    @DisplayName("checkout → producto no visible lanza IllegalStateException")
    void checkout_productNotVisible_throws() {
        testProducto.setVisibleCatalogo(false);

        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));

        assertThatThrownBy(() -> service.checkout(buildRequest(1), CORREO))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("no disponible");
    }

    @Test
    @DisplayName("checkout → si proveedor falla, libera stock reservado")
    void checkout_providerFails_releasesStock() throws Exception {
        setupCheckoutMocks();
        when(mockProvider.crearSesion(any(), any()))
            .thenThrow(new RuntimeException("Stripe timeout"));

        assertThatThrownBy(() -> service.checkout(buildRequest(1), CORREO))
            .isInstanceOf(RuntimeException.class);

        // Debe haberse liberado la reserva (stockReservado = 0 de nuevo)
        ArgumentCaptor<Producto> captor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository, atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues()).anyMatch(p -> p.getStockReservado() == 0);
    }

    // ── confirmarPedido ───────────────────────────────────────────────────────

    @Test
    @DisplayName("confirmarPedido → descuenta stockActual y libera stockReservado")
    void confirmarPedido_decreasesStock() {
        testProducto.setStockActual(10);
        testProducto.setStockReservado(2);

        Pedido pedido = buildPedido(Constants.PEDIDO_PENDIENTE);
        PedidoItem item = buildItem(testProducto, 2);
        pedido.setItems(new ArrayList<>(List.of(item)));

        Pago pago = buildPago(pedido, Constants.PAGO_PENDIENTE);

        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.save(any())).thenReturn(pedido);

        service.confirmarPedido(pago);

        ArgumentCaptor<Producto> captor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository).save(captor.capture());
        assertThat(captor.getValue().getStockActual()).isEqualTo(8);    // 10 - 2
        assertThat(captor.getValue().getStockReservado()).isEqualTo(0); // 2 - 2 = 0

        verify(pedidoRepository).save(argThat(p -> Constants.PEDIDO_PAGADO.equals(p.getEstadoPedido())));
        verify(ventaAvisoService).avisarVentaConfirmada(any(Pedido.class));
    }

    @Test
    @DisplayName("confirmarPedido → idempotente: ignora si pedido ya está PAGADO")
    void confirmarPedido_alreadyPagado_doesNothing() {
        Pedido pedido = buildPedido(Constants.PEDIDO_PAGADO);
        Pago pago = buildPago(pedido, Constants.PAGO_CAPTURADO);

        service.confirmarPedido(pago);

        verify(pedidoRepository, never()).save(any());
        verify(ventaAvisoService, never()).avisarVentaConfirmada(any());
    }

    @Test
    @DisplayName("confirmarPedido → producto único se marca vendido y oculto")
    void confirmarPedido_uniqueProduct_markedSold() {
        testProducto.setEsUnico(true);
        testProducto.setStockActual(1);
        testProducto.setStockReservado(1);

        Pedido pedido = buildPedido(Constants.PEDIDO_PENDIENTE);
        PedidoItem item = buildItem(testProducto, 1);
        pedido.setItems(new ArrayList<>(List.of(item)));

        Pago pago = buildPago(pedido, Constants.PAGO_PENDIENTE);

        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.save(any())).thenReturn(pedido);

        service.confirmarPedido(pago);

        ArgumentCaptor<Producto> captor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository).save(captor.capture());
        assertThat(captor.getValue().getVendido()).isTrue();
        assertThat(captor.getValue().getVisibleCatalogo()).isFalse();
    }

    // ── cancelarPorUsuario ────────────────────────────────────────────────────

    @Test
    @DisplayName("cancelarPorUsuario → libera stock y envía email de pago fallido")
    void cancelarPorUsuario_releasesStock() {
        testProducto.setStockReservado(1);

        Pedido pedido = buildPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setNumeroPedido("ORD-CANCEL-001");
        PedidoItem item = buildItem(testProducto, 1);
        pedido.setItems(new ArrayList<>(List.of(item)));

        Pago pago = buildPago(pedido, Constants.PAGO_PENDIENTE);

        when(pedidoRepository.findByNumeroPedido("ORD-CANCEL-001")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(pedido.getId())).thenReturn(Optional.of(pago));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pagoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.save(any())).thenReturn(pedido);

        service.cancelarPorUsuario("ORD-CANCEL-001", CORREO);

        ArgumentCaptor<Producto> prodCaptor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository).save(prodCaptor.capture());
        assertThat(prodCaptor.getValue().getStockReservado()).isEqualTo(0);
        verify(notificacionEmailService).enviarPagoFallido(any(), anyString());
    }

    @Test
    @DisplayName("cancelarPorUsuario → otro usuario lanza SecurityException")
    void cancelarPorUsuario_otroUsuario_throwsSecurity() {
        Pedido pedido = buildPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setNumeroPedido("ORD-CANCEL-002");

        when(pedidoRepository.findByNumeroPedido("ORD-CANCEL-002")).thenReturn(Optional.of(pedido));

        assertThatThrownBy(() -> service.cancelarPorUsuario("ORD-CANCEL-002", "hacker@evil.com"))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("permiso");
    }

    @Test
    @DisplayName("cancelarPorUsuario → pedido ya procesado lanza IllegalStateException")
    void cancelarPorUsuario_pedidoYaProcesado_throws() {
        Pedido pedido = buildPedido(Constants.PEDIDO_PAGADO); // ya pagado
        pedido.setNumeroPedido("ORD-CANCEL-003");

        when(pedidoRepository.findByNumeroPedido("ORD-CANCEL-003")).thenReturn(Optional.of(pedido));

        assertThatThrownBy(() -> service.cancelarPorUsuario("ORD-CANCEL-003", CORREO))
            .isInstanceOf(IllegalStateException.class);
    }

    // ── marcarFallido ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("marcarFallido → no revierte si pago ya está CAPTURADO")
    void marcarFallido_alreadyCaptured_skips() {
        Pedido pedido = buildPedido(Constants.PEDIDO_PAGADO);
        Pago pago = buildPago(pedido, Constants.PAGO_CAPTURADO);

        service.marcarFallido(pago, "Motivo test");

        verify(pagoRepository, never()).save(any());
        verify(notificacionEmailService, never()).enviarPagoFallido(any(), any());
    }

    // ── cancelarExpirados ─────────────────────────────────────────────────────

    @Test
    @DisplayName("cancelarExpirados → cancela pagos PENDIENTE expirados y libera stock")
    void cancelarExpirados_cancelsExpiredPagos() {
        testProducto.setStockReservado(1);

        Pedido pedido = buildPedido(Constants.PEDIDO_PENDIENTE);
        PedidoItem item = buildItem(testProducto, 1);
        pedido.setItems(new ArrayList<>(List.of(item)));

        Pago pago = buildPago(pedido, Constants.PAGO_PENDIENTE);
        pago.setFechaExpiracion(LocalDateTime.now().minusMinutes(31));

        Empresa empresa = new Empresa();
        empresa.setId(1L);
        empresa.setEstadoEmpresa("ACTIVO");

        when(empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")).thenReturn(List.of(empresa));
        when(pagoRepository.findExpiradosPendientesByEmpresa(any(), eq(1L))).thenReturn(List.of(pago));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pagoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        paymentExpirationCleanupService.cancelarExpirados();

        verify(pagoRepository).saveAll(argThat((List<Pago> list) ->
            list.stream().anyMatch(p -> Constants.PAGO_CANCELADO.equals(p.getEstadoPago()))));
        verify(pedidoRepository).saveAll(argThat((List<Pedido> list) ->
            list.stream().anyMatch(p -> Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido()))));
        ArgumentCaptor<Producto> captor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository).save(captor.capture());
        assertThat(captor.getValue().getStockReservado()).isEqualTo(0);
    }

    @Test
    @DisplayName("cancelarExpirados → sin pagos expirados → sin operaciones")
    void cancelarExpirados_noExpired_noOps() {
        when(empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")).thenReturn(List.of());

        paymentExpirationCleanupService.cancelarExpirados();

        verify(pedidoRepository, never()).save(any());
        verify(productoRepository, never()).save(any());
    }

    // ── liberarReservas ───────────────────────────────────────────────────────

    @Test
    @DisplayName("liberarReservas → restaura stockReservado a 0")
    void liberarReservas_restoresStock() {
        testProducto.setStockReservado(3);

        Pedido pedido = buildPedido(Constants.PEDIDO_CANCELADO);
        pedido.setItems(new ArrayList<>(List.of(buildItem(testProducto, 3))));

        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.liberarReservas(pedido);

        ArgumentCaptor<Producto> captor = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository).save(captor.capture());
        assertThat(captor.getValue().getStockReservado()).isEqualTo(0);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void setupCheckoutMocks() {
        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(testProducto));
        when(productoRepository.findById(10L)).thenReturn(Optional.of(testProducto));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.save(any())).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            if (p.getId() == null) p.setId(100L);
            if (p.getItems() == null) p.setItems(new ArrayList<>());
            return p;
        });
        when(pagoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private PaymentCheckoutRequest buildRequest(int cantidad) {
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setBodegaId(1L);
        req.setMetodoEnvio(Constants.ENVIO_RETIRO);
        req.setProvider("STRIPE");

        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(cantidad);
        req.setItems(List.of(item));
        return req;
    }

    private Pedido buildPedido(String estado) {
        Pedido p = new Pedido();
        p.setId(1L);
        p.setNumeroPedido("ORD-TEST-001");
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(testUser);
        p.setBodega(testBodega);
        p.setCostoEnvio(0);
        p.setTotalPedido(25000);
        p.setItems(new ArrayList<>());
        return p;
    }

    private PedidoItem buildItem(Producto producto, int cantidad) {
        PedidoItem item = new PedidoItem();
        item.setProducto(producto);
        item.setCantidad(cantidad);
        item.setPrecioUnitarioMomento(producto.getPrecioVenta());
        item.setCostoUnitarioMomento(producto.getPrecioCompra());
        return item;
    }

    private Pago buildPago(Pedido pedido, String estadoPago) {
        Pago pago = new Pago();
        pago.setId(1L);
        pago.setMerchantToken("TOKEN-001");
        pago.setMonto(25000);
        pago.setEstadoPago(estadoPago);
        pago.setProveedor("STRIPE");
        pago.setFechaCreacion(LocalDateTime.now());
        pago.setFechaExpiracion(LocalDateTime.now().plusMinutes(30));
        pago.setPedido(pedido);
        pago.setUsuario(testUser);
        return pago;
    }
}
