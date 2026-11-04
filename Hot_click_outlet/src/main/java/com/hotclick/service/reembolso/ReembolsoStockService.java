package com.hotclick.service.reembolso;

import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.stock.StockMovimientoSupport;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Repone el stock de un pedido reembolsado por ONVO, una sola vez: solo si el pedido consumió stock
 * ({@code stockDescontadoEn}) y todavía no se repuso ({@code stockRepuestoEn}, V227). Deja un movimiento
 * DEVOLUCION por producto con referencia al pedido. El llamador tiene el pedido con FOR UPDATE y una transacción.
 */
@Service
public class ReembolsoStockService {

    public static final String REFERENCIA_TIPO = "PEDIDO";

    private final ProductoRepository productoRepository;
    private final StockMovimientoSupport movimientoSupport;

    public ReembolsoStockService(ProductoRepository productoRepository, StockMovimientoSupport movimientoSupport) {
        this.productoRepository = productoRepository;
        this.movimientoSupport = movimientoSupport;
    }

    /** @return true si repuso en esta llamada. */
    public boolean reponerSiCorresponde(Object source, Pedido pedido, String operador) {
        if (pedido == null || pedido.getStockDescontadoEn() == null || pedido.getStockRepuestoEn() != null) return false;
        List<PedidoItem> items = pedido.getItems() == null ? List.of() : pedido.getItems().stream()
            .filter(i -> i.getProducto() != null && i.getProducto().getId() != null
                && i.getCantidad() != null && i.getCantidad() > 0)
            .sorted(Comparator.comparing(i -> i.getProducto().getId())) // orden fijo de locks (P-05)
            .toList();
        Map<Long, Producto> porId = new HashMap<>();
        if (!items.isEmpty()) {
            productoRepository.findAllByIdsForUpdate(items.stream().map(i -> i.getProducto().getId()).distinct().toList())
                .forEach(p -> porId.put(p.getId(), p));
        }
        Map<Long, Producto> tocados = new LinkedHashMap<>();
        List<MovimientoStock> movimientos = new ArrayList<>();
        for (PedidoItem item : items) {
            Producto producto = porId.get(item.getProducto().getId());
            if (producto == null) continue;
            int antes = producto.getStockActual() != null ? producto.getStockActual() : 0;
            int cantidad = item.getCantidad();
            int despues = antes + cantidad;
            producto.setStockActual(despues);
            if (Boolean.TRUE.equals(producto.getEsUnico())) producto.setVendido(false);
            tocados.put(producto.getId(), producto);
            int res = producto.getStockReservado() != null ? producto.getStockReservado() : 0;
            MovimientoStock m = movimientoSupport.buildMovimiento(producto, MovimientoStock.DEVOLUCION, cantidad,
                antes, despues, res, res, pedido.getNumeroPedido(), operador);
            m.setReferenciaTipo(REFERENCIA_TIPO);
            m.setReferenciaId(pedido.getId());
            m.setNotas("Reembolso ONVO del pedido " + Objects.toString(pedido.getNumeroPedido(), ""));
            movimientos.add(m);
        }
        if (!movimientos.isEmpty()) {
            movimientoSupport.guardarLote(movimientos);
            tocados.values().forEach(p -> movimientoSupport.publicarCambioStock(source, p, p.getStockActual()));
        }
        pedido.setStockRepuestoEn(LocalDateTime.now(Constants.ZONA_CR));
        return true;
    }
}
