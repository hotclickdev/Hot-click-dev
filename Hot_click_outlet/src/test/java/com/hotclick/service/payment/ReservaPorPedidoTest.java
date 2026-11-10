package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.ProductoRepository.DuenoProducto;
import com.hotclick.service.stock.StockMovimientoSupport;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * ALTO-01: cancelar un pedido MANUAL PENDIENTE (nunca reservó) liberaba la reserva de un checkout pendiente del
 * mismo producto → sobreventa. Solo se libera/consume lo que el pedido reservó (marca stockReservadoEn).
 */
class ReservaPorPedidoTest {

    private ProductoRepository repo;
    private StockReservationService service;
    private Producto producto;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        repo = mock(ProductoRepository.class);
        service = new StockReservationService();
        ReflectionTestUtils.setField(service, "productoRepository", repo);
        StockMovimientoSupport support = new StockMovimientoSupport();
        ReflectionTestUtils.setField(support, "movimientoStockRepository", mock(MovimientoStockRepository.class));
        ReflectionTestUtils.setField(support, "eventPublisher", mock(ApplicationEventPublisher.class));
        ReflectionTestUtils.setField(service, "movimientoSupport", support);
        empresa = new Empresa();
        empresa.setId(1L);
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setVisibilidadPublica(true);
        producto = new Producto();
        producto.setId(14L);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        producto.setStockActual(5);
        producto.setStockReservado(0);
        producto.setPrecioVenta(1000);
        producto.setPrecioCompra(500);
        producto.setNombreProducto("P14");
        producto.setEsPersonalizado(false);
        producto.setEmpresa(empresa);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(producto));
        when(repo.findByIdForUpdate(14L)).thenReturn(Optional.of(producto));
        when(repo.findDuenoByIds(anyList())).thenReturn(List.of(dueno(14L, 1L)));
        when(repo.findAllByIdsAndEmpresaForUpdate(anyList(), eq(1L))).thenReturn(List.of(producto));
    }

    private static DuenoProducto dueno(long id, long empresaId) {
        return new DuenoProducto() {
            public Long getId() { return id; }
            public Long getEmpresaId() { return empresaId; }
        };
    }

    private Pedido pedido(String numero, int cantidad, boolean reservo) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setEmpresa(empresa);
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        if (reservo) p.setStockReservadoEn(LocalDateTime.now());
        PedidoItem it = new PedidoItem();
        it.setProducto(producto);
        it.setCantidad(cantidad);
        List<PedidoItem> items = new ArrayList<>();
        items.add(it);
        p.setItems(items);
        return p;
    }

    /** Checkout real de 2 unidades: reserva vía reserveForCheckout y el pedido queda dueño de la reserva. */
    private Pedido checkoutPendiente() {
        PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO();
        i.setProductoId(14L);
        i.setCantidad(2);
        service.reserveForCheckout(List.of(i));
        assertThat(producto.getStockReservado()).isEqualTo(2);
        return pedido("CHK-1", 2, true);
    }

    @Test
    @DisplayName("ALTO-01 | cancelar el MANUAL PENDIENTE no toca la reserva del checkout pendiente (dos veces)")
    void cancelarManualNoLiberaReservaAjena() {
        Pedido checkout = checkoutPendiente();
        Pedido manual = pedido("MAN-1", 2, false);

        service.liberarReservas(manual);
        assertThat(producto.getStockReservado()).isEqualTo(2);
        service.liberarReservas(manual);
        assertThat(producto.getStockReservado()).isEqualTo(2);
        assertThat(checkout.getStockReservadoEn()).isNotNull();
    }

    @Test
    @DisplayName("ALTO-01 | cancelar el checkout libera exactamente una vez (idempotente)")
    void cancelarCheckoutLiberaUnaVez() {
        Pedido checkout = checkoutPendiente();
        producto.setStockReservado(3); // otra reserva viva de 1 unidad de otro pedido
        service.liberarReservas(checkout);
        assertThat(producto.getStockReservado()).isEqualTo(1);
        assertThat(checkout.getStockReservadoEn()).isNull();
        service.liberarReservas(checkout);
        assertThat(producto.getStockReservado()).isEqualTo(1);
    }

    @Test
    @DisplayName("ALTO-01 | confirmar el pago de un MANUAL descuenta stockActual pero no la reserva ajena")
    void confirmarManualNoConsumeReservaAjena() {
        checkoutPendiente();
        Pedido manual = pedido("MAN-2", 1, false);
        service.confirmAndConsumeStock(manual, this, mock(ApplicationEventPublisher.class));
        assertThat(producto.getStockActual()).isEqualTo(4);
        assertThat(producto.getStockReservado()).isEqualTo(2);
    }

    @Test
    @DisplayName("ALTO-01 | confirmar el checkout consume su reserva y una cancelación posterior no resta de nuevo")
    void confirmarCheckoutConsumeSuReserva() {
        Pedido checkout = checkoutPendiente();
        service.confirmAndConsumeStock(checkout, this, mock(ApplicationEventPublisher.class));
        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(producto.getStockReservado()).isZero();
        producto.setStockReservado(1); // reserva nueva de otro pedido
        service.liberarReservas(checkout);
        assertThat(producto.getStockReservado()).isEqualTo(1);
    }
}
