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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SinpeCheckoutService — compra por paquetes")
class SinpeCheckoutServiceEmpresaTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private CompraRepository compraRepository;
    @Mock private CuponService cuponService;
    @Mock private GiftCardService giftCardService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private GuestCancelTokenService guestCancelTokenService;
    @Mock private AtribucionPedidoService atribucionPedidoService;
    @Mock private EncargoService encargoService;
    @Mock private PosQrVentaService posQrVentaService;
    @Mock private PaymentNotificationsFacade paymentNotificationsFacade;

    @InjectMocks private CheckoutValidator checkoutValidator;
    @InjectMocks private GuestUserResolver guestUserResolver;
    @InjectMocks private StockReservationService stockReservationService;
    @InjectMocks private OrderPricingService orderPricingService;
    @InjectMocks private CheckoutOrderFactory checkoutOrderFactory;

    private SinpeCheckoutService service;
    private Empresa empresa;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(7L);
        empresa.setPctDescuentoSinpe(BigDecimal.ZERO);

        Bodega bodega = new Bodega();
        bodega.setId(17L);
        bodega.setEmpresa(empresa);

        usuario = new Usuario();
        usuario.setId(3L);
        usuario.setCorreo("buyer@hotclick.cr");

        Producto producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Cable USB");
        producto.setPrecioVenta(5000);
        producto.setPrecioCompra(2000);
        producto.setStockActual(5);
        producto.setStockReservado(0);
        producto.setVisibleCatalogo(true);
        producto.setVendido(false);
        producto.setEmpresa(empresa);
        producto.setBodega(bodega);

        ReflectionTestUtils.setField(checkoutOrderFactory, "encargoService", encargoService);
        service = new SinpeCheckoutService();
        ReflectionTestUtils.setField(service, "checkoutValidator", checkoutValidator);
        ReflectionTestUtils.setField(service, "guestUserResolver", guestUserResolver);
        ReflectionTestUtils.setField(service, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(service, "guestCancelTokenService", guestCancelTokenService);
        ReflectionTestUtils.setField(service, "atribucionPedidoService", atribucionPedidoService);
        CompraCheckoutTestWiring.conectar(service, new CompraCheckoutTestWiring.Piezas(
            checkoutValidator, stockReservationService, orderPricingService, checkoutOrderFactory,
            paymentNotificationsFacade, compraRepository, pedidoRepository, giftCardService, posQrVentaService));

        when(guestCancelTokenService.emitir(any())).thenReturn("tok-test");
        when(usuarioRepository.findByCorreo("buyer@hotclick.cr")).thenReturn(Optional.of(usuario));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            if (p.getId() == null) p.setId(100L);
            return p;
        });
        when(pagoRepository.save(any(Pago.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("checkout SINPE: el pedido sale de la bodega del negocio y espera comprobante")
    void checkout_asignaEmpresaDelProducto() {
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setBodegaId(1L);
        req.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(1);
        req.setItems(List.of(item));

        PaymentCheckoutResponse resp = service.checkout(req, "buyer@hotclick.cr");

        ArgumentCaptor<Pedido> captor = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepository, atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues()).allMatch(p -> p.getEmpresa() == empresa);
        assertThat(captor.getValue().getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(captor.getValue().getBodega().getId()).isEqualTo(17L);
        assertThat(resp.getTotal()).isEqualTo(5000 + 2000);
        assertThat(resp.getCancelToken()).isEqualTo("tok-test");
        assertThat(resp.getProveedor()).isEqualTo(Constants.PROVEEDOR_SINPE);

        ArgumentCaptor<Pago> pago = ArgumentCaptor.forClass(Pago.class);
        verify(pagoRepository).save(pago.capture());
        assertThat(pago.getValue().getFechaExpiracion()).isNull();
        assertThat(pago.getValue().getCompra()).isNotNull();
    }
}
