package com.hotclick.service.payment;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.ProductoRepository.DuenoProducto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

/** fix2: liberarReservasDeGrupoBloqueado — un solo lock ORDER BY id, suma por producto, fail-closed, sin catch. */
class StockReservationLoteGrupoTest {

    private ProductoRepository repo;
    private StockReservationService servicio;
    private Map<Long, Producto> productos;

    @BeforeEach
    void armar() {
        repo = mock(ProductoRepository.class);
        servicio = new StockReservationService();
        ReflectionTestUtils.setField(servicio, "productoRepository", repo);
        productos = new java.util.TreeMap<>();
    }

    private Producto prod(long id, int stock, int reservado, long empresa) {
        Producto p = new Producto();
        p.setId(id);
        p.setStockActual(stock);
        p.setStockReservado(reservado);
        Empresa e = new Empresa();
        e.setId(empresa);
        p.setEmpresa(e);
        productos.put(id, p);
        return p;
    }

    private Pedido pedido(long id, long empresa, long[][] lineas) {
        Pedido ped = new Pedido();
        ped.setId(id);
        Empresa e = new Empresa();
        e.setId(empresa);
        ped.setEmpresa(e);
        ped.setStockReservadoEn(LocalDateTime.now());
        List<PedidoItem> items = new ArrayList<>();
        for (long[] l : lineas) {
            PedidoItem it = new PedidoItem();
            it.setProducto(productos.get(l[0]));
            it.setCantidad((int) l[1]);
            items.add(it);
        }
        ped.setItems(items);
        return ped;
    }

    private void stubDuenos() {
        List<DuenoProducto> filas = productos.values().stream().map(p -> {
            DuenoProducto d = mock(DuenoProducto.class);
            when(d.getId()).thenReturn(p.getId());
            when(d.getEmpresaId()).thenReturn(p.getEmpresaId());
            return d;
        }).collect(Collectors.toList());
        when(repo.findDuenoByIds(anyList())).thenReturn(filas);
    }

    @Test
    @DisplayName("3 pedidos, productos repetidos: UN solo findAllByIdsForUpdate con ids ordenados; reserva exacta; marcas limpias")
    void sumaPorProductoUnSoloLock() {
        Producto a = prod(5, 100, 10, 1), b = prod(3, 100, 7, 1), c = prod(9, 100, 4, 1);
        Pedido p1 = pedido(1, 1, new long[][]{{5, 2}, {3, 1}, {9, 1}});
        Pedido p2 = pedido(2, 1, new long[][]{{3, 3}, {9, 1}, {5, 1}});
        Pedido p3 = pedido(3, 1, new long[][]{{9, 2}, {5, 1}, {3, 1}});
        stubDuenos();
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(b, a, c));

        servicio.liberarReservasDeGrupoBloqueado(List.of(p1, p2, p3));

        ArgumentCaptor<List<Long>> ids = ArgumentCaptor.forClass(List.class);
        verify(repo, times(1)).findAllByIdsForUpdate(ids.capture());
        assertThat(ids.getValue()).containsExactly(3L, 5L, 9L);
        verify(repo, never()).findByIdForUpdate(any());
        assertThat(a.getStockReservado()).isEqualTo(10 - 4);
        assertThat(b.getStockReservado()).isEqualTo(7 - 5);
        assertThat(c.getStockReservado()).isEqualTo(Math.max(0, 4 - 4));
        assertThat(List.of(a, b, c)).allMatch(p -> p.getStockActual() == 100);
        assertThat(List.of(p1, p2, p3)).allMatch(p -> p.getStockReservadoEn() == null);
        InOrder o = inOrder(repo);
        o.verify(repo).findDuenoByIds(anyList());
        o.verify(repo).findAllByIdsForUpdate(anyList());
    }

    @Test
    @DisplayName("reserva nunca negativa; personalizado se salta")
    void sinNegativosYPersonalizado() {
        Producto a = prod(1, 10, 1, 1), per = prod(2, 10, 5, 1);
        per.setEsPersonalizado(true);
        Pedido p = pedido(1, 1, new long[][]{{1, 4}, {2, 3}});
        stubDuenos();
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(a, per));

        servicio.liberarReservasDeGrupoBloqueado(List.of(p));

        assertThat(a.getStockReservado()).isZero();
        assertThat(per.getStockReservado()).isEqualTo(5);
    }

    @Test
    @DisplayName("fail-closed: producto ausente del lock → excepción, marcas intactas, sin saves")
    void faltaProducto() {
        Producto a = prod(1, 10, 3, 1);
        prod(2, 10, 3, 1);
        Pedido p = pedido(1, 1, new long[][]{{1, 1}, {2, 1}});
        stubDuenos();
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(a));

        assertThatThrownBy(() -> servicio.liberarReservasDeGrupoBloqueado(List.of(p)))
            .isInstanceOf(RecursoNoEncontradoException.class);

        assertThat(p.getStockReservadoEn()).isNotNull();
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("tenant: producto de otra empresa → aborta ANTES de bloquear nada")
    void otroNegocioNoSeBloquea() {
        prod(1, 10, 3, 99);
        Pedido p = pedido(1, 1, new long[][]{{1, 1}});
        stubDuenos();

        assertThatThrownBy(() -> servicio.liberarReservasDeGrupoBloqueado(List.of(p)))
            .isInstanceOf(RecursoNoEncontradoException.class);

        verify(repo, never()).findAllByIdsForUpdate(anyList());
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("sin catch genérico: un error del save se propaga")
    void errorSePropaga() {
        Producto a = prod(1, 10, 3, 1);
        Pedido p = pedido(1, 1, new long[][]{{1, 1}});
        stubDuenos();
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(a));
        when(repo.save(any())).thenThrow(new IllegalStateException("db"));

        assertThatThrownBy(() -> servicio.liberarReservasDeGrupoBloqueado(List.of(p)))
            .isInstanceOf(IllegalStateException.class).hasMessage("db");
    }

    @Test
    @DisplayName("línea inválida (cantidad 0) o pedido sin empresa → aborta; lista vacía no toca la base")
    void entradasInvalidas() {
        prod(1, 10, 3, 1);
        Pedido cero = pedido(1, 1, new long[][]{{1, 0}});
        assertThatThrownBy(() -> servicio.liberarReservasDeGrupoBloqueado(List.of(cero)))
            .isInstanceOf(IllegalStateException.class);
        Pedido sinEmpresa = pedido(2, 1, new long[][]{{1, 1}});
        sinEmpresa.setEmpresa(null);
        assertThatThrownBy(() -> servicio.liberarReservasDeGrupoBloqueado(List.of(sinEmpresa)))
            .isInstanceOf(IllegalStateException.class);

        servicio.liberarReservasDeGrupoBloqueado(List.of());
        verifyNoInteractions(repo);
    }

    @Test
    @DisplayName("antes del lock en lote se sueltan las copias de producto de la sesión (evita @Version viejo)")
    void sueltaCopiasAntesDelLock() {
        jakarta.persistence.EntityManager em = mock(jakarta.persistence.EntityManager.class);
        ReflectionTestUtils.setField(servicio, "entityManager", em);
        Producto a = prod(1, 10, 3, 1);
        Pedido p = pedido(1, 1, new long[][]{{1, 1}});
        when(em.contains(a)).thenReturn(true);
        stubDuenos();
        when(repo.findAllByIdsForUpdate(anyList())).thenReturn(List.of(a));

        servicio.liberarReservasDeGrupoBloqueado(List.of(p));

        InOrder o = inOrder(em, repo);
        o.verify(em).detach(a);
        o.verify(repo).findAllByIdsForUpdate(anyList());
    }
}
