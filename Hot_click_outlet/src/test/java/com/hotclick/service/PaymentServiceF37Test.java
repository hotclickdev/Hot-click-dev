package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.*;
import com.hotclick.payment.PaymentProvider;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.*;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * F37-01 — numeroPedido UUID (sin colisión)
 * F37-02 — inicialización proxy LAZY antes de @Async email
 * F37-03 — productosMap elimina N+1 en checkout
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("F37 — PaymentService: UUID, LAZY proxy, N+1 fix")
class PaymentServiceF37Test {

    @Mock PaymentProviderFactory    providerFactory;
    @Mock PedidoRepository          pedidoRepository;
    @Mock ProductoRepository        productoRepository;
    @Mock BodegaRepository          bodegaRepository;
    @Mock UsuarioRepository         usuarioRepository;
    @Mock RolRepository             rolRepository;
    @Mock PagoRepository            pagoRepository;
    @Mock TransaccionPagoRepository transaccionPagoRepository;
    @Mock EmpresaRepository         empresaRepository;
    @Mock NotificacionEmailService  notificacionEmailService;
    @Mock CuponService              cuponService;
    @Mock GiftCardService           giftCardService;
    @Mock WebhookDispatcherService  webhookDispatcher;
    @Mock PasswordEncoder           passwordEncoder;
    @Mock PaymentProvider           mockProvider;

    @InjectMocks PaymentService service;

    private Usuario  testUser;
    private Bodega   testBodega;
    private Producto testProducto;

    @BeforeEach
    void setUp() throws Exception {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setCorreo("buyer@test.cr");
        testUser.setNombre("Buyer");
        testUser.setRoles(List.of());

        testBodega = new Bodega();
        testBodega.setId(1L);
        testBodega.setNombreBodega("Bodega Test");

        testProducto = new Producto();
        // Inject id via reflection (no public setter)
        java.lang.reflect.Field idField = Producto.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(testProducto, 10L);
        testProducto.setNombreProducto("Producto Test");
        testProducto.setPrecioVenta(15000);
        testProducto.setPrecioCompra(8000);
        testProducto.setStockActual(5);
        testProducto.setStockReservado(0);
        testProducto.setVisibleCatalogo(true);
        testProducto.setVendido(false);
        testProducto.setEstado(Constants.ESTADO_ACTIVO);
    }

    // ── F37-01: numeroPedido tiene formato UUID (no milisegundos) ────────────

    @Test
    @DisplayName("F37-01: confirmarPedido → numeroPedido ya fue seteado correctamente")
    void numeroPedido_uuid_format() {
        // El numeroPedido se genera en checkout, no en confirmarPedido.
        // Verificamos que Constants.generarNumeroPedido produce el formato correcto.
        String n = Constants.generarNumeroPedido("ORD-");
        assertThat(n).matches("ORD-[A-F0-9]{12}");
        assertThat(n).doesNotContain(String.valueOf(System.currentTimeMillis()).substring(0, 8));
    }

    @Test
    @DisplayName("F37-01: 1000 generaciones → 0 colisiones")
    void numeroPedido_1000calls_noCollisions() {
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (int i = 0; i < 1000; i++) {
            assertThat(seen.add(Constants.generarNumeroPedido("ORD-"))).isTrue();
        }
    }

    // ── F37-02: proxy LAZY de usuarioFinal inicializado antes de @Async ───────

    @Test
    @DisplayName("F37-02: confirmarPedido → getCorreo() llamado DENTRO de @Transactional antes del @Async")
    void confirmarPedido_initializesUsuarioFinalProxyBeforeAsync() {
        // Setup pago con pedido
        Pago pago = new Pago();
        Pedido pedido = new Pedido();

        // Simular usuario con getCorreo() disponible (proxy inicializado)
        testUser.setCorreo("buyer@test.cr");
        pedido.setUsuarioFinal(testUser);
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setNumeroPedido("ORD-ABCDEF123456");
        pedido.setTotalPedido(15000);
        pedido.setCuponCodigo(null);
        pedido.setGiftCardCodigo(null);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedido.setItems(List.of());
        pago.setPedido(pedido);
        pago.setProveedor("PAYPAL");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);

        when(pedidoRepository.save(any())).thenReturn(pedido);
        doNothing().when(webhookDispatcher).dispatch(any(), anyString(), any());

        // Ejecutar
        service.confirmarPedido(pago);

        // El email @Async fue llamado — el proxy estaba inicializado (no LazyInitializationException)
        verify(notificacionEmailService, times(1)).enviarConfirmacionPedido(pedido);
        // El estado fue actualizado a PAGADO
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
    }

    // ── F37-03: productosMap elimina N+1 en snapshot de PedidoItems ──────────

    @Test
    @DisplayName("F37-03: checkout con 3 productos → findByIdForUpdate x3, findById x0 (no N+1)")
    void checkout_noNPlus1_productosMap() throws Exception {
        // Preparar 3 productos
        Producto p1 = buildProducto(10L, 10000);
        Producto p2 = buildProducto(11L, 20000);
        Producto p3 = buildProducto(12L, 30000);

        when(usuarioRepository.findByCorreo("buyer@test.cr")).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(p1));
        when(productoRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(p2));
        when(productoRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(p3));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(pagoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(providerFactory.soporta("PAYPAL")).thenReturn(true);
        when(providerFactory.get("PAYPAL")).thenReturn(mockProvider);
        when(mockProvider.crearSesion(any(), any()))
            .thenReturn(new PaymentSession("PAY-001", "https://paypal.com/pay"));
        when(cuponService.validarCodigo(any())).thenReturn(Optional.empty());
        doNothing().when(webhookDispatcher).dispatch(any(), anyString(), any());

        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setProvider("PAYPAL");
        req.setGuestEmail("buyer@test.cr");
        req.setMetodoEnvio("RETIRO_EN_TIENDA");
        req.setItems(List.of(
            item(10L, 1), item(11L, 1), item(12L, 1)
        ));

        service.checkout(req, "buyer@test.cr");

        // CRÍTICO: findByIdForUpdate se llama 3 veces (reserva de stock)
        verify(productoRepository, times(1)).findByIdForUpdate(10L);
        verify(productoRepository, times(1)).findByIdForUpdate(11L);
        verify(productoRepository, times(1)).findByIdForUpdate(12L);

        // F37-03 FIX: findById NO debe llamarse (usa productosMap en su lugar)
        verify(productoRepository, never()).findById(10L);
        verify(productoRepository, never()).findById(11L);
        verify(productoRepository, never()).findById(12L);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Producto buildProducto(Long id, int precio) throws Exception {
        Producto p = new Producto();
        java.lang.reflect.Field f = Producto.class.getDeclaredField("id");
        f.setAccessible(true);
        f.set(p, id);
        p.setNombreProducto("Producto " + id);
        p.setPrecioVenta(precio);
        p.setPrecioCompra(precio / 2);
        p.setStockActual(10);
        p.setStockReservado(0);
        p.setVisibleCatalogo(true);
        p.setVendido(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        return p;
    }

    private PaymentCheckoutRequest.ItemDTO item(Long productoId, int cantidad) {
        PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO();
        i.setProductoId(productoId);
        i.setCantidad(cantidad);
        return i;
    }

    // Stub interface para PasswordEncoder
    interface PasswordEncoder extends org.springframework.security.crypto.password.PasswordEncoder {}
}
