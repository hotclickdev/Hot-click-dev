package com.hotclick.service.pedido;

import com.hotclick.model.MovimientoStock;
import com.hotclick.model.OrigenPedido;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.stock.StockMovimientoSupport;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** P-07: pedido manual ENTREGADO descuenta stock una vez y deja movimiento con referencia al pedido. */
class PedidoManualEntregaStockServiceTest {

    private PedidoManualEntregaStockService svc;
    private ProductoRepository productoRepo;
    private MovimientoStockRepository movRepo;
    private Producto producto;

    @BeforeEach
    void setUp() {
        svc = new PedidoManualEntregaStockService();
        productoRepo = mock(ProductoRepository.class);
        movRepo = mock(MovimientoStockRepository.class);
        StockMovimientoSupport support = new StockMovimientoSupport();
        ReflectionTestUtils.setField(support, "eventPublisher", mock(ApplicationEventPublisher.class));
        ReflectionTestUtils.setField(svc, "productoRepository", productoRepo);
        ReflectionTestUtils.setField(svc, "movimientoStockRepository", movRepo);
        ReflectionTestUtils.setField(svc, "movimientoSupport", support);
        producto = new Producto();
        producto.setId(4L);
        producto.setStockActual(5);
        when(productoRepo.findAllByIdsForUpdate(List.of(4L))).thenReturn(List.of(producto));
    }

    private Pedido pedido(String origen, String estado) {
        Pedido p = new Pedido();
        p.setId(19L);
        p.setNumeroPedido("HC-19");
        p.setOrigen(origen);
        p.setEstadoPedido(estado);
        PedidoItem it = new PedidoItem();
        it.setProducto(producto);
        it.setCantidad(2);
        p.setItems(List.of(it));
        return p;
    }

    @Test
    @DisplayName("ENTREGADO marcado dos veces: descuenta una sola vez, movimiento VENTA con referencia al pedido")
    void dosVecesDescuentaUnaVez() {
        Pedido p = pedido(OrigenPedido.MANUAL.codigo(), Constants.PEDIDO_ENTREGADO);

        assertThat(svc.descontarSiCorresponde(this, p, "admin@test.cr")).isTrue();
        assertThat(svc.descontarSiCorresponde(this, p, "admin@test.cr")).isFalse();

        assertThat(producto.getStockActual()).isEqualTo(3);
        assertThat(p.getStockDescontadoEn()).isNotNull();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MovimientoStock>> cap = ArgumentCaptor.forClass(List.class);
        verify(movRepo, times(1)).saveAll(cap.capture());
        assertThat(cap.getValue()).hasSize(1);
        MovimientoStock m = cap.getValue().get(0);
        verify(productoRepo, never()).findByIdForUpdate(any());
        assertThat(m.getTipoMovimiento()).isEqualTo(MovimientoStock.VENTA);
        assertThat(m.getCantidad()).isEqualTo(2);
        assertThat(m.getReferencia()).isEqualTo("HC-19");
        assertThat(m.getReferenciaTipo()).isEqualTo("PEDIDO");
        assertThat(m.getReferenciaId()).isEqualTo(19L);
    }

    @Test
    @DisplayName("Pedido que ya consumió stock al confirmar el pago no vuelve a descontar")
    void yaDescontadoAlPagarNoDescuenta() {
        Pedido p = pedido(OrigenPedido.MANUAL.codigo(), Constants.PEDIDO_ENTREGADO);
        p.setStockDescontadoEn(LocalDateTime.now());
        assertThat(svc.descontarSiCorresponde(this, p, "x")).isFalse();
        assertThat(producto.getStockActual()).isEqualTo(5);
        verify(movRepo, never()).saveAll(any());
    }

    @Test
    @DisplayName("Solo pedidos MANUAL en ENTREGADO; ONLINE no se toca")
    void soloManualEntregado() {
        assertThat(svc.descontarSiCorresponde(this, pedido(OrigenPedido.ONLINE.codigo(), Constants.PEDIDO_ENTREGADO), "x")).isFalse();
        assertThat(svc.descontarSiCorresponde(this, pedido(OrigenPedido.MANUAL.codigo(), Constants.PEDIDO_ENVIADO), "x")).isFalse();
        assertThat(producto.getStockActual()).isEqualTo(5);
    }

    @Test
    @DisplayName("Sin stock suficiente no deja stock negativo")
    void nuncaNegativo() {
        producto.setStockActual(1);
        svc.descontarSiCorresponde(this, pedido(OrigenPedido.MANUAL.codigo(), Constants.PEDIDO_ENTREGADO), "x");
        assertThat(producto.getStockActual()).isZero();
    }
}
