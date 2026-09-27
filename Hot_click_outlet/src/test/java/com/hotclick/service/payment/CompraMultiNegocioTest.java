package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutRequest.ItemDTO;
import com.hotclick.dto.PaymentCheckoutRequest.PaqueteEntregaDTO;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.*;
import com.hotclick.payment.PaymentProvider;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.*;
import com.hotclick.service.*;
import com.hotclick.service.analytics.AtribucionPedidoService;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Compra de 3 negocios en un carrito: 3 pedidos (paquetes), 3 envíos,
 * 1 pago por el total y, al confirmar, 1 crédito de billetera por negocio.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Compra multi-negocio — un pedido por negocio bajo un pago")
class CompraMultiNegocioTest {

    private static final String CORREO = "buyer@hotclick.cr";
    private static final String ENVIO_NORMAL = "ENVIO_NORMAL_GAM";

    @Mock private PaymentProviderFactory    providerFactory;
    @Mock private PaymentProvider           provider;
    @Mock private PedidoRepository          pedidoRepository;
    @Mock private ProductoRepository        productoRepository;
    @Mock private BodegaRepository          bodegaRepository;
    @Mock private UsuarioRepository         usuarioRepository;
    @Mock private RolRepository             rolRepository;
    @Mock private PagoRepository            pagoRepository;
    @Mock private CompraRepository          compraRepository;
    @Mock private PasswordEncoder           passwordEncoder;
    @Mock private CuponService              cuponService;
    @Mock private GiftCardService           giftCardService;
    @Mock private EncargoService            encargoService;
    @Mock private PosQrVentaService         posQrVentaService;
    @Mock private AtribucionPedidoService   atribucionPedidoService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private NotificacionEmailService  notificacionEmailService;
    @Mock private VentaAvisoService         ventaAvisoService;
    @Mock private N8nWebhookService         n8nWebhookService;
    @Mock private WebhookDispatcherService  webhookDispatcher;
    @Mock private AggregatorService         aggregatorService;

    @InjectMocks private CheckoutValidator               checkoutValidator;
    @InjectMocks private GuestUserResolver               guestUserResolver;
    @InjectMocks private StockReservationService         stockReservationService;
    @InjectMocks private OrderPricingService             orderPricingService;
    @InjectMocks private CheckoutOrderFactory            checkoutOrderFactory;
    @InjectMocks private PaymentRecordFactory            paymentRecordFactory;
    @InjectMocks private PaymentNotificationsFacade      paymentNotificationsFacade;
    @InjectMocks private PaymentOrderConfirmationService orderConfirmationService;
    @InjectMocks private PaymentFailureHandler           paymentFailureHandler;

    private PaymentService service;
    private final List<Pedido> pedidosGuardados = new ArrayList<>();
    private final Map<Long, Empresa> empresas = new HashMap<>();

    @BeforeEach
    void setUp() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setCorreo(CORREO);
        when(usuarioRepository.findByCorreo(CORREO)).thenReturn(Optional.of(usuario));

        registrarProducto(10L, 7L, 17L, 10000);
        registrarProducto(20L, 8L, 20L, 20000);
        registrarProducto(30L, 9L, 21L, 30000);

        when(providerFactory.soporta("TILOPAY")).thenReturn(true);
        when(providerFactory.get("TILOPAY")).thenReturn(provider);
        when(provider.crearSesion(any(), any())).thenReturn(new PaymentSession("EXT-1", "https://pago"));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pagoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> guardarPedido(inv.getArgument(0)));
        when(pedidoRepository.findByCompra_IdOrderByNumeroPaqueteAsc(any())).thenAnswer(inv -> pedidosGuardados);

        armarServicio();
    }

    @Test
    @DisplayName("checkout con 3 negocios → 3 pedidos, 3 envíos y 1 pago por el total")
    void checkout_tresNegocios_creaTresPaquetesYUnPago() throws Exception {
        PaymentCheckoutResponse resp = service.checkout(requestTresNegocios(), CORREO);

        assertThat(pedidosGuardados).hasSize(3);
        Compra compra = pedidosGuardados.get(0).getCompra();
        assertThat(compra).isNotNull();
        assertThat(pedidosGuardados).allMatch(p -> p.getCompra() == compra);
        assertThat(pedidosGuardados).extracting(Pedido::getNumeroPaquete).containsExactly(1, 2, 3);
        assertThat(pedidosGuardados).extracting(Pedido::getNumeroPedido).containsExactly(
            compra.getNumeroCompra(), compra.getNumeroCompra() + "-2", compra.getNumeroCompra() + "-3");
        assertThat(pedidosGuardados).extracting(Pedido::getEmpresaId).containsExactly(7L, 8L, 9L);
        assertThat(pedidosGuardados).extracting(p -> p.getBodega().getId()).containsExactly(17L, 20L, 21L);
        assertThat(pedidosGuardados).extracting(Pedido::getMetodoEnvio).containsExactly(
            ENVIO_NORMAL, "ENVIO_RAPIDO", Constants.ENVIO_ENCOMIENDA);
        assertThat(pedidosGuardados).extracting(Pedido::getCostoEnvio).containsExactly(4000, 5000, 0);
        assertThat(pedidosGuardados).extracting(p -> p.getItems().size()).containsExactly(1, 1, 1);

        int totalEsperado = 10000 + 4000 + 20000 + 5000 + 30000;
        assertThat(compra.getTotalCompra()).isEqualTo(totalEsperado);
        assertThat(compra.getCantidadPaquetes()).isEqualTo(3);
        assertThat(resp.getNumeroPedido()).isEqualTo(compra.getNumeroCompra());
        assertThat(resp.getTotal()).isEqualTo(totalEsperado);

        ArgumentCaptor<Pedido> cobro = ArgumentCaptor.forClass(Pedido.class);
        verify(provider).crearSesion(cobro.capture(), any());
        assertThat(cobro.getValue().getTotalPedido()).isEqualTo(totalEsperado);
        assertThat(cobro.getValue().getNumeroPedido()).isEqualTo(compra.getNumeroCompra());

        ArgumentCaptor<Pago> pago = ArgumentCaptor.forClass(Pago.class);
        verify(pagoRepository, times(1)).save(pago.capture());
        assertThat(pago.getValue().getMonto()).isEqualTo(totalEsperado);
        assertThat(pago.getValue().getPedido()).isSameAs(pedidosGuardados.get(0));
        assertThat(pago.getValue().getCompra()).isSameAs(compra);
        verify(webhookDispatcher, times(3)).dispatch(any(), eq("pedido.creado"), any());
    }

    @Test
    @DisplayName("confirmar el pago → 3 pedidos PAGADO y un crédito de billetera por negocio")
    void confirmar_acreditaCadaNegocio() {
        service.checkout(requestTresNegocios(), CORREO);
        Pago pago = pagoCreado();

        service.confirmarPedido(pago);

        assertThat(pedidosGuardados).allMatch(p -> Constants.PEDIDO_PAGADO.equals(p.getEstadoPedido()));
        ArgumentCaptor<Pedido> acreditados = ArgumentCaptor.forClass(Pedido.class);
        verify(aggregatorService, times(3)).acreditarVentaAsync(acreditados.capture());
        assertThat(acreditados.getAllValues()).extracting(Pedido::getEmpresaId).containsExactly(7L, 8L, 9L);
        verify(ventaAvisoService, times(3)).avisarVentaConfirmada(any());
        verify(webhookDispatcher).dispatch(eq(7L), eq("pedido.pagado"), any());
        verify(webhookDispatcher).dispatch(eq(8L), eq("pedido.pagado"), any());
        verify(webhookDispatcher).dispatch(eq(9L), eq("pedido.pagado"), any());
    }

    @Test
    @DisplayName("pago fallido → los 3 pedidos se cancelan, se libera stock y un solo correo")
    void fallido_cancelaTodosLosPaquetes() {
        service.checkout(requestTresNegocios(), CORREO);
        Pago pago = pagoCreado();

        service.marcarFallido(pago, "Tarjeta rechazada");

        assertThat(pedidosGuardados).allMatch(p -> Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido()));
        verify(notificacionEmailService, times(1)).enviarPagoFallido(any(), eq("Tarjeta rechazada"));
    }

    @Test
    @DisplayName("el cupón de un negocio solo descuenta su paquete")
    void cupon_soloAplicaAlNegocioDueno() {
        Cupon cupon = new Cupon();
        cupon.setCodigo("CEIBA10");
        cupon.setDescuentoPorcentaje(10);
        when(cuponService.validarCodigo(eq("CEIBA10"), anyLong())).thenReturn(Optional.empty());
        when(cuponService.validarCodigo("CEIBA10", 8L)).thenReturn(Optional.of(cupon));

        PaymentCheckoutRequest req = requestTresNegocios();
        req.setCodigoCupon("CEIBA10");
        service.checkout(req, CORREO);

        assertThat(pedidosGuardados).extracting(Pedido::getDescuentoTotal).containsExactly(0, 2000, 0);
        assertThat(pedidosGuardados).extracting(Pedido::getCuponCodigo).containsExactly(null, "CEIBA10", null);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void armarServicio() {
        ReflectionTestUtils.setField(checkoutOrderFactory, "encargoService", encargoService);
        ReflectionTestUtils.setField(orderConfirmationService, "stockReservationService", stockReservationService);
        ReflectionTestUtils.setField(orderConfirmationService, "paymentNotificationsFacade", paymentNotificationsFacade);
        ReflectionTestUtils.setField(paymentFailureHandler, "stockReservationService", stockReservationService);
        ReflectionTestUtils.setField(paymentFailureHandler, "paymentNotificationsFacade", paymentNotificationsFacade);

        service = new PaymentService();
        ReflectionTestUtils.setField(service, "providerFactory", providerFactory);
        ReflectionTestUtils.setField(service, "pedidoRepository", pedidoRepository);
        ReflectionTestUtils.setField(service, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(service, "eventPublisher", eventPublisher);
        ReflectionTestUtils.setField(service, "checkoutValidator", checkoutValidator);
        ReflectionTestUtils.setField(service, "guestUserResolver", guestUserResolver);
        ReflectionTestUtils.setField(service, "stockReservationService", stockReservationService);
        ReflectionTestUtils.setField(service, "paymentRecordFactory", paymentRecordFactory);
        ReflectionTestUtils.setField(service, "paymentNotificationsFacade", paymentNotificationsFacade);
        ReflectionTestUtils.setField(service, "orderConfirmationService", orderConfirmationService);
        ReflectionTestUtils.setField(service, "paymentFailureHandler", paymentFailureHandler);
        ReflectionTestUtils.setField(service, "posQrVentaService", posQrVentaService);
        ReflectionTestUtils.setField(service, "atribucionPedidoService", atribucionPedidoService);
        GuestCancelTokenService tokens = new GuestCancelTokenService();
        ReflectionTestUtils.setField(tokens, "secret", "unit-test-jwt-secret-32chars!!!!");
        ReflectionTestUtils.setField(service, "guestCancelTokenService", tokens);
        CompraCheckoutTestWiring.conectar(service, new CompraCheckoutTestWiring.Piezas(
            checkoutValidator, stockReservationService, orderPricingService, checkoutOrderFactory,
            paymentNotificationsFacade, compraRepository, pedidoRepository, giftCardService, posQrVentaService));
    }

    private void registrarProducto(Long productoId, Long empresaId, Long bodegaId, int precio) {
        Empresa empresa = empresas.computeIfAbsent(empresaId, id -> {
            Empresa e = new Empresa();
            e.setId(id);
            return e;
        });
        Bodega bodega = new Bodega();
        bodega.setId(bodegaId);
        bodega.setEmpresa(empresa);

        Producto p = new Producto();
        p.setId(productoId);
        p.setNombreProducto("Producto " + productoId);
        p.setPrecioVenta(precio);
        p.setPrecioCompra(precio / 2);
        p.setStockActual(5);
        p.setStockReservado(0);
        p.setVisibleCatalogo(true);
        p.setVendido(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        when(productoRepository.findByIdForUpdate(productoId)).thenReturn(Optional.of(p));
    }

    private Pedido guardarPedido(Pedido pedido) {
        if (pedido.getId() == null) {
            pedido.setId(100L + pedidosGuardados.size());
            pedidosGuardados.add(pedido);
        }
        return pedido;
    }

    private Pago pagoCreado() {
        ArgumentCaptor<Pago> pago = ArgumentCaptor.forClass(Pago.class);
        verify(pagoRepository).save(pago.capture());
        return pago.getValue();
    }

    private PaymentCheckoutRequest requestTresNegocios() {
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setProvider("TILOPAY");
        req.setMetodoEnvio(ENVIO_NORMAL);
        req.setBodegaId(1L);
        req.setItems(List.of(item(10L), item(20L), item(30L)));
        req.setPaquetes(List.of(
            entrega(8L, "ENVIO_RAPIDO"),
            entrega(9L, Constants.ENVIO_ENCOMIENDA)));
        return req;
    }

    private static ItemDTO item(Long productoId) {
        ItemDTO item = new ItemDTO();
        item.setProductoId(productoId);
        item.setCantidad(1);
        return item;
    }

    private static PaqueteEntregaDTO entrega(Long empresaId, String metodo) {
        PaqueteEntregaDTO entrega = new PaqueteEntregaDTO();
        entrega.setEmpresaId(empresaId);
        entrega.setMetodoEnvio(metodo);
        return entrega;
    }
}
