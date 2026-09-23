package com.hotclick.service.sinpe;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.CuponService;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SinpeCheckoutService — empresa en pedido")
class SinpeCheckoutServiceEmpresaTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private CuponService cuponService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private GuestCancelTokenService guestCancelTokenService;

    @InjectMocks private SinpeCheckoutService service;

    private Empresa empresa;
    private Bodega bodega;
    private Usuario usuario;
    private Producto producto;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(7L);

        bodega = new Bodega();
        bodega.setId(1L);
        bodega.setEmpresa(empresa);

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

        when(guestCancelTokenService.emitir(any())).thenReturn("tok-test");
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
            p.setId(100L);
            return p;
        });
        when(pagoRepository.save(any(Pago.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setBodegaId(1L);
        req.setMetodoEnvio("RETIRO_EN_TIENDA");
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(1);
        req.setItems(List.of(item));

        PaymentCheckoutResponse resp = service.checkout(req, "buyer@hotclick.cr");

        ArgumentCaptor<Pedido> captor = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues()).allMatch(p -> p.getEmpresa() == empresa);
        assertThat(captor.getValue().getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(resp.getCancelToken()).isEqualTo("tok-test");
        assertThat(resp.getProveedor()).isEqualTo(Constants.PROVEEDOR_SINPE);
    }
}
