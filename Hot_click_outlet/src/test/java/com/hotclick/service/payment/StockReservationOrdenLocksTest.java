package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.stock.StockMovimientoSupport;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** P-05 (C1): los locks de stock se toman en orden de id, en un solo batch, para evitar deadlocks. */
class StockReservationOrdenLocksTest {

    private Producto producto(long id, int stock) {
        Producto p = new Producto();
        p.setId(id);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setStockActual(stock);
        p.setStockReservado(0);
        p.setPrecioVenta(1000);
        p.setPrecioCompra(500);
        p.setNombreProducto("P" + id);
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
        StockMovimientoSupport support = new StockMovimientoSupport();
        ReflectionTestUtils.setField(support, "movimientoStockRepository", mock(MovimientoStockRepository.class));
        ReflectionTestUtils.setField(support, "eventPublisher", mock(ApplicationEventPublisher.class));
        ReflectionTestUtils.setField(s, "movimientoSupport", support);
        return s;
    }

    @Test
    @DisplayName("P-05 | carrito [B,A,B] → un solo SELECT FOR UPDATE con ids únicos ordenados [A,B]")
    @SuppressWarnings("unchecked")
    void batchOrdenado() {
        ProductoRepository repo = mock(ProductoRepository.class);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(producto(3, 10), producto(7, 10)));
        StockReservationResult r = servicio(repo).reserveForCheckout(List.of(item(7, 1), item(3, 2), item(7, 1)));

        ArgumentCaptor<List<Long>> ids = ArgumentCaptor.forClass(List.class);
        verify(repo).findAllByIdsForUpdate(ids.capture());
        assertThat(ids.getValue()).containsExactly(3L, 7L);
        verify(repo, never()).findByIdForUpdate(any());
        assertThat(r.productosMap().get(7L).getStockReservado()).isEqualTo(2);
        assertThat(r.productosMap().get(3L).getStockReservado()).isEqualTo(2);
    }

    @Test
    @DisplayName("P-05 | duplicados suman contra el stock disponible")
    void duplicadosSuman() {
        ProductoRepository repo = mock(ProductoRepository.class);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(producto(5, 1)));
        assertThatThrownBy(() -> servicio(repo).reserveForCheckout(List.of(item(5, 1), item(5, 1))))
            .isInstanceOf(com.hotclick.exception.StockInsuficienteException.class);
    }

    @Test
    @DisplayName("P-05 | producto inexistente → 404, no se reserva nada a medias sin lock")
    void inexistente() {
        ProductoRepository repo = mock(ProductoRepository.class);
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(producto(1, 5)));
        assertThatThrownBy(() -> servicio(repo).reserveForCheckout(List.of(item(1, 1), item(99, 1))))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("P-05 | confirmar y liberar bloquean en orden de id aunque el pedido venga [9,2]")
    void confirmarYLiberarOrdenados() {
        ProductoRepository repo = mock(ProductoRepository.class);
        Empresa empresa = new Empresa();
        empresa.setId(1L);
        Producto p9 = producto(9, 5), p2 = producto(2, 5);
        p9.setEmpresa(empresa);
        p2.setEmpresa(empresa);
        when(repo.findByIdForUpdate(9L)).thenReturn(Optional.of(p9));
        when(repo.findByIdForUpdate(2L)).thenReturn(Optional.of(p2));
        when(repo.findEmpresaIdById(2L)).thenReturn(Optional.of(1L));
        when(repo.findEmpresaIdById(9L)).thenReturn(Optional.of(1L));
        when(repo.findAllByIdsAndEmpresaForUpdate(anyList(), eq(1L))).thenReturn(List.of(p2, p9));
        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        List<PedidoItem> items = new ArrayList<>();
        for (Producto p : List.of(p9, p2)) {
            PedidoItem it = new PedidoItem();
            it.setProducto(p);
            it.setCantidad(1);
            items.add(it);
        }
        pedido.setItems(items);
        StockReservationService s = servicio(repo);

        pedido.setStockReservadoEn(java.time.LocalDateTime.now()); // ALTO-01: pedido de checkout que reservó
        s.confirmAndConsumeStock(pedido, this, e -> { });
        pedido.setStockReservadoEn(java.time.LocalDateTime.now());
        s.liberarReservas(pedido);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> ids = ArgumentCaptor.forClass(List.class);
        verify(repo).findAllByIdsAndEmpresaForUpdate(ids.capture(), eq(1L));
        assertThat(ids.getValue()).containsExactly(2L, 9L);
        InOrder o = inOrder(repo);
        o.verify(repo).findEmpresaIdById(2L);
        o.verify(repo).findEmpresaIdById(9L);
        o.verify(repo).findAllByIdsAndEmpresaForUpdate(anyList(), eq(1L));
        o.verify(repo).findByIdForUpdate(2L);
        o.verify(repo).findByIdForUpdate(9L);
    }
}
