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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * P-07: un pedido MANUAL que se marca ENTREGADO (al crearlo o después) descuenta stock_actual y deja un
 * movimiento VENTA con referencia al pedido. Idempotente: {@code stockDescontadoEn} no nulo (ya descontó
 * aquí o al confirmar el pago) → no hace nada. El llamador tiene el pedido con FOR UPDATE o recién creado.
 */
@Service
public class PedidoManualEntregaStockService {

    private static final Logger log = LoggerFactory.getLogger(PedidoManualEntregaStockService.class);
    public static final String REFERENCIA_TIPO = "PEDIDO";

    @Autowired private ProductoRepository productoRepository;
    @Autowired private MovimientoStockRepository movimientoStockRepository;
    @Autowired private StockMovimientoSupport movimientoSupport;

    /** @return true si descontó en esta llamada. */
    @Transactional
    public boolean descontarSiCorresponde(Object source, Pedido pedido, String operadorCorreo) {
        if (pedido == null || pedido.getStockDescontadoEn() != null) return false;
        if (!Constants.PEDIDO_ENTREGADO.equals(pedido.getEstadoPedido())) return false;
        if (!OrigenPedido.MANUAL.codigo().equals(pedido.getOrigen())) return false;
        List<PedidoItem> items = pedido.getItems() == null ? List.of() : pedido.getItems().stream()
            .filter(i -> i.getProducto() != null && i.getProducto().getId() != null
                && i.getCantidad() != null && i.getCantidad() > 0)
            .sorted(Comparator.comparing(i -> i.getProducto().getId())) // orden fijo de locks (P-05)
            .toList();
        for (PedidoItem item : items) {
            Producto producto = productoRepository.findByIdForUpdate(item.getProducto().getId()).orElse(null);
            if (producto == null) continue;
            int antes = producto.getStockActual() != null ? producto.getStockActual() : 0;
            int cantidad = Math.min(item.getCantidad(), Math.max(0, antes)); // nunca deja stock negativo
            if (cantidad < item.getCantidad()) {
                log.warn("[P-07] pedido manual {}: producto {} sin stock suficiente para la entrega", pedido.getId(),
                    producto.getId());
            }
            int despues = antes - cantidad;
            producto.setStockActual(despues);
            if (Boolean.TRUE.equals(producto.getEsUnico()) && cantidad > 0) producto.setVendido(true);
            if (despues <= 0) producto.setVisibleCatalogo(false);
            productoRepository.save(producto);

            int res = producto.getStockReservado() != null ? producto.getStockReservado() : 0;
            MovimientoStock m = movimientoSupport.buildMovimiento(producto, MovimientoStock.VENTA, cantidad,
                antes, despues, res, res, pedido.getNumeroPedido(), operadorCorreo);
            m.setReferenciaTipo(REFERENCIA_TIPO);
            m.setReferenciaId(pedido.getId());
            m.setNotas("Entrega de pedido manual " + Objects.toString(pedido.getNumeroPedido(), ""));
            movimientoStockRepository.save(m);
            movimientoSupport.publicarCambioStock(source, producto, despues);
        }
        pedido.setStockDescontadoEn(LocalDateTime.now(Constants.ZONA_CR));
        return true;
    }
}
