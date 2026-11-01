package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

/** M-08: los productos personalizados o bajo pedido entran al checkout sin stock; los normales siguen igual. */
class StockReservationPersonalizadoTest {

    private Producto producto(long id, int stock, boolean personalizado) {
        Producto p = new Producto();
        p.setId(id);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setStockActual(stock);
        p.setStockReservado(0);
        p.setPrecioVenta(1000);
        p.setPrecioCompra(500);
        p.setNombreProducto("P" + id);
        p.setEsPersonalizado(personalizado);
        return p;
    }

    private PaymentCheckoutRequest.ItemDTO item(long id, int cant) {
        PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO();
        i.setProductoId(id);
        i.setCantidad(cant);
        return i;
    }

    private StockReservationService servicio(ProductoRepository repo) {
        StockReservationService s = new StockReservationService();
        ReflectionTestUtils.setField(s, "productoRepository", repo);
        return s;
    }

    @Test
    @DisplayName("M-08 | personalizado con stock 0 entra al checkout: sin error y sin reservar")
    void personalizadoSinStockEntra() {
        ProductoRepository repo = mock(ProductoRepository.class);
        Producto p = producto(1, 0, true);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(p));

        StockReservationResult r = servicio(repo).reserveForCheckout(List.of(item(1, 3)));

        assertThat(r.subtotal()).isEqualTo(3000);
        assertThat(r.productosMap()).containsKey(1L);
        assertThat(p.getStockReservado()).isZero();
        assertThat(p.getStockActual()).isZero();
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("M-08 | normal con stock 0 sigue fallando con StockInsuficienteException")
    void normalSinStockFalla() {
        ProductoRepository repo = mock(ProductoRepository.class);
        Producto p = producto(2, 0, false);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(p));

        assertThatThrownBy(() -> servicio(repo).reserveForCheckout(List.of(item(2, 1))))
            .isInstanceOf(StockInsuficienteException.class);
        assertThat(p.getStockReservado()).isZero();
    }

    @Test
    @DisplayName("M-08 | carrito mixto: el personalizado no reserva y el normal reserva solo lo suyo")
    void carritoMixto() {
        ProductoRepository repo = mock(ProductoRepository.class);
        Producto pers = producto(1, 0, true);
        Producto normal = producto(2, 5, false);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(pers, normal));

        StockReservationResult r = servicio(repo).reserveForCheckout(List.of(item(2, 2), item(1, 4)));

        assertThat(r.subtotal()).isEqualTo(6000);
        assertThat(pers.getStockReservado()).isZero();
        assertThat(normal.getStockReservado()).isEqualTo(2);
        verify(repo, times(1)).save(normal);
        verify(repo, never()).save(pers);
    }

    @Test
    @DisplayName("M-08 | carrito mixto con el normal sin stock: falla entero, el personalizado no queda reservado")
    void carritoMixtoNormalSinStockFalla() {
        ProductoRepository repo = mock(ProductoRepository.class);
        Producto pers = producto(1, 0, true);
        Producto normal = producto(2, 1, false);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(pers, normal));

        assertThatThrownBy(() -> servicio(repo).reserveForCheckout(List.of(item(1, 2), item(2, 2))))
            .isInstanceOf(StockInsuficienteException.class);
        assertThat(pers.getStockReservado()).isZero();
    }

    @Test
    @DisplayName("M-08 | liberar reservas no toca el stockReservado de un personalizado (nunca reservó)")
    void liberarNoTocaPersonalizado() {
        ProductoRepository repo = mock(ProductoRepository.class);
        Producto pers = producto(1, 0, true);
        pers.setStockReservado(2); // reserva de otro origen: no es de este pedido
        Producto normal = producto(2, 5, false);
        normal.setStockReservado(3);
        when(repo.findByIdForUpdate(1L)).thenReturn(Optional.of(pers));
        when(repo.findByIdForUpdate(2L)).thenReturn(Optional.of(normal));

        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-M08B");
        pedido.setItems(new ArrayList<>());
        for (Producto p : List.of(pers, normal)) {
            PedidoItem it = new PedidoItem();
            it.setProducto(p);
            it.setCantidad(2);
            pedido.getItems().add(it);
        }

        servicio(repo).liberarReservas(pedido);

        assertThat(pers.getStockReservado()).isEqualTo(2);
        assertThat(normal.getStockReservado()).isEqualTo(1);
    }
}
