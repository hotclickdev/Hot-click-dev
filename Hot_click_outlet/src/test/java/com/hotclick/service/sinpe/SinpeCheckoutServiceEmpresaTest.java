package com.hotclick.service.sinpe;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.CuponService;
import com.hotclick.service.EncargoService;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.analytics.AtribucionPedidoService;
import com.hotclick.service.payment.*;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SinpeCheckoutService — empresa en pedido")
class SinpeCheckoutServiceEmpresaTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private CuponService cuponService;
    @Mock private GiftCardService giftCardService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private SinpeOnvoMarketplaceService sinpeOnvo;
    @Mock private GuestCancelTokenService guestCancelTokenService;
    @Mock private AtribucionPedidoService atribucionPedidoService;
    @Mock private EncargoService encargoService;

    @Mock private com.hotclick.service.payment.ReservaAntiBotService reservaAntiBot;
    @InjectMocks private CheckoutValidator checkoutValidator;
    @InjectMocks private GuestUserResolver guestUserResolver;
    @InjectMocks private StockReservationService stockReservationService;
    @InjectMocks private OrderPricingService orderPricingService;
    @InjectMocks private CheckoutOrderFactory checkoutOrderFactory;

    private SinpeCheckoutService service;

    private Empresa empresa;
    private Bodega bodega;
    private Usuario usuario;
    private Producto producto;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.when(sinpeOnvo.destinoDisponible()).thenReturn("DESTINO_ONVO_PRUEBA");
        org.mockito.Mockito.lenient().when(sinpeOnvo.iniciar(any(), any(), any(), any())).thenReturn(java.time.LocalDateTime.now().plusMinutes(15));
        empresa = new Empresa();
        empresa.setId(7L);

        bodega = new Bodega();
        bodega.setId(1L);
        bodega.setEmpresa(empresa);
        bodega.setPermiteRetiroCliente(true);

        usuario = new Usuario();
        usuario.setId(3L);
        usuario.setCorreo("buyer@hotclick.cr");

        producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Cable USB");
        producto.setPrecioVenta(5000);
        producto.setPrecioCompra(2000);
        producto.setStockActual(5);
        producto.setStockReservado(0);
        producto.setVisibleCatalogo(true);
        producto.setVendido(false);
        producto.setBodega(bodega);

        when(guestCancelTokenService.emitir(any())).thenReturn("tok-test");

        ReflectionTestUtils.setField(checkoutOrderFactory, "encargoService", encargoService);
        CheckoutPaquetesPlanner planner = new CheckoutPaquetesPlanner();
        CheckoutGrupoFactory checkoutGrupoFactory = new CheckoutGrupoFactory(
            checkoutValidator, planner, orderPricingService, checkoutOrderFactory, giftCardService);

        service = new SinpeCheckoutService();
        org.springframework.test.util.ReflectionTestUtils.setField(service, "sinpeOnvo", sinpeOnvo);
        ReflectionTestUtils.setField(service, "reservaAntiBot", reservaAntiBot);
        ReflectionTestUtils.setField(service, "autocompraGuard", guardAutocompra());
        ReflectionTestUtils.setField(service, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(service, "checkoutValidator", checkoutValidator);
        ReflectionTestUtils.setField(service, "guestUserResolver", guestUserResolver);
        ReflectionTestUtils.setField(service, "stockReservationService", stockReservationService);
        ReflectionTestUtils.setField(service, "checkoutGrupoFactory", checkoutGrupoFactory);
        ReflectionTestUtils.setField(service, "guestCancelTokenService", guestCancelTokenService);
        ReflectionTestUtils.setField(service, "atribucionPedidoService", atribucionPedidoService);
        ReflectionTestUtils.setField(service, "sinpeManualHabilitado", true); // flujo legacy (apagado en prod)
        ReflectionTestUtils.setField(service, "efectivoWebHabilitado", true); // efectivo web (apagado: solo POS)
    }

    private static com.hotclick.service.pedido.AutocompraNegocioGuard guardAutocompra() {
        com.hotclick.service.pedido.AutocompraNegocioGuard g = new com.hotclick.service.pedido.AutocompraNegocioGuard();
        ReflectionTestUtils.setField(g, "miembroEmpresaRepository", org.mockito.Mockito.mock(MiembroEmpresaRepository.class));
        ReflectionTestUtils.setField(g, "usuarioRepository", org.mockito.Mockito.mock(UsuarioRepository.class));
        return g;
    }

    @Test
    @DisplayName("checkout SINPE asigna pedido.empresa desde bodega")
    void checkout_asignaEmpresaDeBodega() {
        when(usuarioRepository.findByCorreo("buyer@hotclick.cr")).thenReturn(Optional.of(usuario));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(bodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(productoRepository.findById(10L)).thenReturn(Optional.of(producto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            if (p.getId() == null) p.setId(100L);
            return p;
        });
        when(pagoRepository.save(any(Pago.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setBodegaId(1L);
        req.setMetodoEnvio("RETIRO_EN_TIENDA");
        req.setProvider("SINPE");
        req.setSinpeIdentificacion("01-1234-5678");
        req.setSinpeTipoIdentificacion(0);
        req.setSinpeTelefono("80000000");
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(1);
        req.setItems(List.of(item));

        PaymentCheckoutResponse resp = service.checkout(req, "buyer@hotclick.cr");

        ArgumentCaptor<Pedido> captor = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues()).allMatch(p -> p.getEmpresa() == empresa);
        assertThat(captor.getValue().getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE); // P-01: SINPE ONVO, sin comprobante
        assertThat(resp.getCancelToken()).isEqualTo("tok-test");
        assertThat(resp.getProveedor()).isEqualTo(Constants.PROVEEDOR_SINPE);
    }

    @Test
    @DisplayName("G1b: checkout efectivo de un usuario del negocio vendedor (logueado o invitado por correo) se bloquea")
    void checkout_autocompra_403() {
        usuario.setEmpresa(empresa); // el comprador es del negocio 7, dueño de la bodega
        when(usuarioRepository.findByCorreo("buyer@hotclick.cr")).thenReturn(Optional.of(usuario));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(bodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(productoRepository.findById(10L)).thenReturn(Optional.of(producto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setBodegaId(1L);
        req.setProvider("EFECTIVO");
        req.setGuestEmail("buyer@hotclick.cr");
        req.setMetodoEnvio("RETIRO_EN_TIENDA");
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(1);
        req.setItems(List.of(item));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.checkout(req, "anonymousUser"))
            .as("invitado con el correo del dueño")
            .isInstanceOf(com.hotclick.exception.AutocompraNegocioException.class);
        verify(pagoRepository, org.mockito.Mockito.never()).save(any(Pago.class));
    }

    @Test
    @DisplayName("M-01 | checkout SINPE con producto en oferta → total = precio de oferta × cantidad")
    void checkout_sinpe_cobraPrecioOferta() {
        when(usuarioRepository.findByCorreo("buyer@hotclick.cr")).thenReturn(Optional.of(usuario));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(bodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(productoRepository.findById(10L)).thenReturn(Optional.of(producto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            if (p.getId() == null) p.setId(100L);
            return p;
        });
        when(pagoRepository.save(any(Pago.class))).thenAnswer(inv -> inv.getArgument(0));
        producto.setEnOferta(true);
        producto.setPrecioOferta(4000);

        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setBodegaId(1L);
        req.setMetodoEnvio("RETIRO_EN_TIENDA");
        req.setProvider("SINPE");
        req.setSinpeIdentificacion("01-1234-5678");
        req.setSinpeTipoIdentificacion(0);
        req.setSinpeTelefono("80000000");
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(2);
        req.setItems(List.of(item));

        PaymentCheckoutResponse resp = service.checkout(req, "buyer@hotclick.cr");

        assertThat(resp.getTotal()).isEqualTo(8000);
        ArgumentCaptor<Pago> pago = ArgumentCaptor.forClass(Pago.class);
        verify(pagoRepository, org.mockito.Mockito.atLeastOnce()).save(pago.capture());
        assertThat(pago.getValue().getMonto()).isEqualTo(8000);
    }
}
