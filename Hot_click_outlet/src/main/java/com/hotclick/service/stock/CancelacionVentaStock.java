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

        // Bloqueo de fila de todos los candidatos en un solo SELECT FOR UPDATE (orden estable por id).
        // La consulta «ya repuesto» va DESPUÉS del bloqueo: una cancelación concurrente espera aquí y,
        // al continuar, ve el movimiento que la otra confirmó (no repone dos veces).
        List<Long> candidatos = porProducto.keySet().stream().filter(conDescuento::contains).sorted().toList();
        // Los productos que el pedido ya trajo a la sesión pueden estar desfasados si otra cancelación
        // confirmó mientras esta esperaba: se sueltan para que el SELECT FOR UPDATE los lea frescos
        // (si no, Hibernate lanza un conflicto de versión en vez de esperar y releer).
        if (entityManager != null) {
            for (PedidoItem item : pedido.getItems()) {
                Producto gestionado = item.getProducto();
                if (gestionado != null && candidatos.contains(gestionado.getId()) && entityManager.contains(gestionado)) {
                    entityManager.detach(gestionado);
                }
            }
        }
        List<Producto> bloqueados = productoRepository.findAllByIdsForUpdate(candidatos);
        Set<Long> yaRepuestos = movimientoStockRepository.productoIdsPorTipoYReferencia(
            MovimientoStock.CANCELACION_VENTA, referencia);
        List<Producto> productos = bloqueados.stream().filter(p -> !yaRepuestos.contains(p.getId())).toList();
        if (productos.isEmpty()) return true;
        String operador = operadorActual();
        List<MovimientoStock> movimientos = new ArrayList<>();
        for (Producto producto : productos) {
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
        // Los productos están gestionados y bloqueados en esta transacción: se persisten al confirmar.
        movimientoStockRepository.saveAllAndFlush(movimientos);
        log.info("Cancelación de venta {}: stock repuesto en {} producto(s)", referencia, productos.size());
        return true;
    }

    private static String operadorActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "sistema";
    }
}
