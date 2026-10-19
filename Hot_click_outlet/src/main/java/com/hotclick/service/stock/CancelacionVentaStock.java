package com.hotclick.service.stock;

import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.ProductoRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Cancelación de una venta registrada a mano que descontó stock al crearse y todavía no tiene cobro.
 * Devuelve el stock descontado (una sola vez) en lugar de liberar reservas, que esa venta no tiene.
 */
@Component
public class CancelacionVentaStock {

    private static final Logger log = LoggerFactory.getLogger(CancelacionVentaStock.class);

    @Autowired private PagoRepository pagoRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private MovimientoStockRepository movimientoStockRepository;
    @Autowired private StockMovimientoSupport movimientoSupport;
    @PersistenceContext private EntityManager entityManager;

    /**
     * @return true si el pedido es una venta manual sin cobro con descuento de stock (el stock quedó
     *         repuesto o ya lo estaba); false si no aplica y el llamador debe liberar reservas como siempre.
     */
    @Transactional
    public boolean reponerSiVentaManualSinCobro(Pedido pedido) {
        if (pedido == null || pedido.getId() == null || pedido.getNumeroPedido() == null) return false;
        if (pagoRepository.findTopByPedidoId(pedido.getId()).isPresent()) return false;
        Hibernate.initialize(pedido.getItems());

        Map<Long, Integer> porProducto = new LinkedHashMap<>();
        for (PedidoItem item : pedido.getItems()) {
            if (item.getProducto() != null && item.getCantidad() != null) {
                porProducto.merge(item.getProducto().getId(), item.getCantidad(), Integer::sum);
            }
        }
        String referencia = pedido.getNumeroPedido();
        Set<Long> conDescuento = movimientoStockRepository.productoIdsPorTipoYReferencia(MovimientoStock.VENTA, referencia);
        if (porProducto.keySet().stream().noneMatch(conDescuento::contains)) return false;
        Set<Long> yaRepuestos = movimientoStockRepository.productoIdsPorTipoYReferencia(
            MovimientoStock.CANCELACION_VENTA, referencia);

        List<Long> pendientes = porProducto.keySet().stream()
            .filter(id -> conDescuento.contains(id) && !yaRepuestos.contains(id))
            .sorted()
            .toList();
        if (pendientes.isEmpty()) return true;

        // Bloqueo de fila de todos los productos en un solo SELECT FOR UPDATE (orden estable por id).
        List<Producto> productos = productoRepository.findAllByIdsForUpdate(pendientes);
        String operador = operadorActual();
        List<MovimientoStock> movimientos = new ArrayList<>();
        for (Producto producto : productos) {
            if (entityManager != null && entityManager.contains(producto)) entityManager.refresh(producto);
            int cantidad = porProducto.get(producto.getId());
            int actAntes = producto.getStockActual();
            int actDespues = actAntes + cantidad;
            int reservado = producto.getStockReservado();
            producto.setStockActual(actDespues);
            if (Boolean.TRUE.equals(producto.getEsUnico())) {
                producto.setVendido(false);
            }
            movimientos.add(movimientoSupport.buildMovimiento(producto, MovimientoStock.CANCELACION_VENTA, cantidad,
                actAntes, actDespues, reservado, reservado, referencia, operador));
            movimientoSupport.publicarCambioStock(this, producto, actDespues);
        }
        productoRepository.saveAll(productos);
        movimientoStockRepository.saveAll(movimientos);
        log.info("Cancelación de venta {}: stock repuesto en {} producto(s)", referencia, productos.size());
        return true;
    }

    private static String operadorActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "sistema";
    }
}
