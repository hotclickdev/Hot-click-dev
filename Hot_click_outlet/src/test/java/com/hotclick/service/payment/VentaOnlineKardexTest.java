package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.pedido.PedidoManualEntregaStockService;
import com.hotclick.service.stock.StockMovimientoSupport;
import com.hotclick.sse.StockCambioEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Venta ONLINE pagada: un movimiento de inventario por línea, el mismo registro que POS y P-07,
 * sin duplicar al reconfirmar y sin tocar el stock de otro negocio.
 */
class VentaOnlineKardexTest {

    private ProductoRepository repo;
    private MovimientoStockRepository movRepo;
    private StockReservationService service;
    private ApplicationEventPublisher eventos;
    private Empresa empresaA;
    private Empresa empresaB;

    @BeforeEach
    void setUp() {
        repo = mock(ProductoRepository.class);
        movRepo = mock(MovimientoStockRepository.class);
        eventos = mock(ApplicationEventPublisher.class);
        service = new StockReservationService();
        StockMovimientoSupport support = new StockMovimientoSupport();
        ReflectionTestUtils.setField(support, "movimientoStockRepository", movRepo);
        ReflectionTestUtils.setField(support, "eventPublisher", mock(ApplicationEventPublisher.class));
        ReflectionTestUtils.setField(service, "productoRepository", repo);
        ReflectionTestUtils.setField(service, "movimientoSupport", support);
        empresaA = empresa(10L);
        empresaB = empresa(20L);
        when(repo.findAllByIdsAndEmpresaForUpdate(anyList(), any())).thenAnswer(inv -> {
            List<Long> ids = inv.getArgument(0);
            Long empresaId = inv.getArgument(1);
            List<Producto> encontrados = new ArrayList<>();
            for (Long id : ids) {
                Producto p = productoDe(id);
                if (p != null && empresaId.equals(p.getEmpresaId())) encontrados.add(p);
            }
            return encontrados;
        });
    }

    private final Producto producto5 = producto(5L, 10, 3, 10L);
    private final Producto producto13 = producto(13L, 7, 1, 10L);

    @Test
    @DisplayName("Una venta pagada deja un movimiento por línea; reconfirmar no duplica; stock y kardex cuadran")
    void unaVenta_unMovimientoPorLinea_reconfirmarNoDuplica_kardexCuadra() {
        producto13.setEmpresa(empresaA);
        when(repo.findEmpresaIdById(5L)).thenReturn(Optional.of(10L));
        when(repo.findEmpresaIdById(13L)).thenReturn(Optional.of(10L));
        Pedido venta = pedido(77L, "ORD-77", empresaA, true, linea(producto5, 2), linea(producto13, 4));

        service.confirmAndConsumeStock(venta, this, eventos);
        service.confirmAndConsumeStock(venta, this, eventos);

        assertThat(producto5.getStockActual()).isEqualTo(8);
        assertThat(producto5.getStockReservado()).isEqualTo(1);
        assertThat(producto13.getStockActual()).isEqualTo(3);
        assertThat(producto13.getStockReservado()).isZero();
        assertThat(venta.getStockDescontadoEn()).isNotNull();
        assertThat(venta.getStockReservadoEn()).isNull();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MovimientoStock>> cap = ArgumentCaptor.forClass(List.class);
        verify(movRepo, times(1)).saveAll(cap.capture());
        assertThat(cap.getValue()).hasSize(2);
        assertMovimiento(cap.getValue().get(0), producto5, 2, 10, 8, 3, 1, "ORD-77", 77L);
        assertMovimiento(cap.getValue().get(1), producto13, 4, 7, 3, 1, 0, "ORD-77", 77L);
        verify(eventos, times(2)).publishEvent(any(StockCambioEvent.class));
        verify(repo).findAllByIdsAndEmpresaForUpdate(eq(List.of(5L, 13L)), eq(10L));
        verify(repo, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("Un producto de otro negocio no se descuenta ni entra al kardex; el propio sí")
    void aislamientoEntreTenants() {
        producto13.setEmpresa(empresaB);
        producto13.setStockActual(4);
        producto13.setStockReservado(1);
        when(repo.findEmpresaIdById(5L)).thenReturn(Optional.of(10L));
        when(repo.findEmpresaIdById(13L)).thenReturn(Optional.of(20L));

        Pedido ventaA = pedido(81L, "ORD-81", empresaA, true, linea(producto5, 2), linea(producto13, 1));
        service.confirmAndConsumeStock(ventaA, this, eventos);
        service.confirmAndConsumeStock(ventaA, this, eventos);

        assertThat(producto5.getStockActual()).isEqualTo(8);
        assertThat(producto5.getStockReservado()).isEqualTo(1);
        assertThat(producto13.getStockActual()).isEqualTo(4);
        assertThat(producto13.getStockReservado()).isEqualTo(1);

        Pedido ventaB = pedido(82L, "ORD-82", empresaB, true, linea(producto13, 1));
        service.confirmAndConsumeStock(ventaB, this, eventos);

        assertThat(producto13.getStockActual()).isEqualTo(3);
        assertThat(producto13.getStockReservado()).isZero();
        assertThat(producto5.getStockActual()).isEqualTo(8);
        assertThat(producto5.getStockReservado()).isEqualTo(1);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MovimientoStock>> cap = ArgumentCaptor.forClass(List.class);
        verify(movRepo, times(2)).saveAll(cap.capture());
        assertThat(cap.getAllValues().get(0)).hasSize(1);
        assertMovimiento(cap.getAllValues().get(0).get(0), producto5, 2, 10, 8, 3, 1, "ORD-81", 81L);
        assertThat(cap.getAllValues().get(1)).hasSize(1);
        assertMovimiento(cap.getAllValues().get(1).get(0), producto13, 1, 4, 3, 1, 0, "ORD-82", 82L);
        verify(repo).findAllByIdsAndEmpresaForUpdate(eq(List.of(5L)), eq(10L));
        verify(repo).findAllByIdsAndEmpresaForUpdate(eq(List.of(13L)), eq(20L));
        verify(repo, never()).findAllByIdsAndEmpresaForUpdate(eq(List.of(13L)), eq(10L));
        verify(repo, never()).findByIdForUpdate(any());
        verify(repo, never()).findAllByIdsForUpdate(anyList());
    }

    @Test
    @DisplayName("Si no alcanza el stock, el movimiento registra solo lo descontado y el saldo queda en 0")
    void faltante_kardexQuedaEnCero() {
        producto5.setStockActual(1);
        producto5.setStockReservado(1);
        when(repo.findEmpresaIdById(5L)).thenReturn(Optional.of(10L));
        Pedido venta = pedido(91L, "ORD-91", empresaA, true, linea(producto5, 3));

        service.confirmAndConsumeStock(venta, this, eventos);

        assertThat(producto5.getStockActual()).isZero();
        assertThat(producto5.getStockReservado()).isZero();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MovimientoStock>> cap = ArgumentCaptor.forClass(List.class);
        verify(movRepo).saveAll(cap.capture());
        assertThat(cap.getValue()).hasSize(1);
        MovimientoStock m = cap.getValue().get(0);
        assertThat(m.getCantidad()).isEqualTo(1);
        assertThat(m.getStockActualAntes()).isEqualTo(1);
        assertThat(m.getStockActualDespues()).isZero();
        assertThat(m.getStockReservadoAntes()).isEqualTo(1);
        assertThat(m.getStockReservadoDespues()).isZero();
        assertThat(m.getNotas()).contains("FALTANTE: 2");
    }

    @Test
    @DisplayName("Sin empresa del pedido no se descuenta ni se escribe movimiento")
    void sinEmpresaNoConsume() {
        when(repo.findEmpresaIdById(5L)).thenReturn(Optional.of(10L));
        Pedido venta = pedido(90L, "ORD-90", null, true, linea(producto5, 2));
        service.confirmAndConsumeStock(venta, this, eventos);
        assertThat(producto5.getStockActual()).isEqualTo(10);
        assertThat(producto5.getStockReservado()).isEqualTo(3);
        assertThat(venta.getStockDescontadoEn()).isNull();
        assertThat(venta.getStockReservadoEn()).isNotNull();
        verify(movRepo, never()).saveAll(any());
        verify(repo, never()).findAllByIdsAndEmpresaForUpdate(anyList(), any());
        verify(eventos, never()).publishEvent(any());
    }

    private void assertMovimiento(MovimientoStock m, Producto producto, int cantidad,
                                  int actAntes, int actDespues, int resAntes, int resDespues,
                                  String numero, long pedidoId) {
        assertThat(m.getProducto()).isSameAs(producto);
        assertThat(m.getTipoMovimiento()).isEqualTo(MovimientoStock.VENTA);
        assertThat(m.getTipo()).isEqualTo(MovimientoStock.VENTA);
        assertThat(m.getCantidad()).isEqualTo(cantidad);
        assertThat(m.getStockActualAntes()).isEqualTo(actAntes);
        assertThat(m.getStockActualDespues()).isEqualTo(actDespues);
        assertThat(m.getStockActualAntes() - m.getCantidad()).isEqualTo(m.getStockActualDespues());
        assertThat(producto.getStockActual()).isEqualTo(m.getStockActualDespues());
        assertThat(m.getStockReservadoAntes()).isEqualTo(resAntes);
        assertThat(m.getStockReservadoDespues()).isEqualTo(resDespues);
        assertThat(producto.getStockReservado()).isEqualTo(m.getStockReservadoDespues());
        assertThat(m.getReferencia()).isEqualTo(numero);
        assertThat(m.getReferenciaTipo()).isEqualTo(PedidoManualEntregaStockService.REFERENCIA_TIPO);
        assertThat(m.getReferenciaId()).isEqualTo(pedidoId);
        assertThat(m.getFechaMovimiento()).isNotNull();
        assertThat(m.getNotas()).startsWith("Venta online pagada " + numero);
    }

    private Producto productoDe(Long id) {
        if (Long.valueOf(5L).equals(id)) return producto5;
        if (Long.valueOf(13L).equals(id)) return producto13;
        return null;
    }

    private static Empresa empresa(long id) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        return e;
    }

    private static Producto producto(long id, int stock, int reservado, long empresaId) {
        Producto p = new Producto();
        p.setId(id);
        p.setNombreProducto("P" + id);
        p.setStockActual(stock);
        p.setStockReservado(reservado);
        p.setEmpresa(empresa(empresaId));
        return p;
    }

    private static PedidoItem linea(Producto producto, int cantidad) {
        PedidoItem it = new PedidoItem();
        it.setProducto(producto);
        it.setCantidad(cantidad);
        return it;
    }

    private static Pedido pedido(long id, String numero, Empresa empresa, boolean reservo, PedidoItem... items) {
        Pedido p = new Pedido();
        p.setId(id);
        p.setNumeroPedido(numero);
        p.setEmpresa(empresa);
        p.setOrigen("ONLINE");
        if (reservo) p.setStockReservadoEn(java.time.LocalDateTime.now());
        p.setItems(new ArrayList<>(List.of(items)));
        return p;
    }
}
