package com.hotclick.service.stock;

import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class StockVentaOperations {

    private static final Logger log = LoggerFactory.getLogger(StockVentaOperations.class);

    @Autowired private ProductoRepository productoRepository;
    @Autowired private StockMovimientoSupport movimientoSupport;

    @Transactional
    public void descontarPorVenta(Object source, Producto producto, int cantidad,
                                  boolean liberarReservaPrevia,
                                  String referencia, String operadorCorreo) {
        descontarPorVentaConTipo(source, producto, cantidad, liberarReservaPrevia,
            MovimientoStock.VENTA, referencia, operadorCorreo);
    }

    @Transactional
    public void descontarPorVentaPOS(Object source, Producto producto, int cantidad,
                                      String referencia, String operadorCorreo) {
        descontarPorVentaConTipo(source, producto, cantidad, false,
            MovimientoStock.VENTA_POS, referencia, operadorCorreo);
    }

    void descontarPorVentaConTipo(Object source, Producto producto, int cantidad,
                                   boolean liberarReservaPrevia, String tipo,
                                   String referencia, String operadorCorreo) {
        int actAntes  = producto.getStockActual();
        int actDespues = actAntes - cantidad;
        producto.setStockActual(actDespues);

        int resAntes   = producto.getStockReservado();
        int resDespues = liberarReservaPrevia
            ? Math.max(0, resAntes - cantidad)
            : resAntes;
        producto.setStockReservado(resDespues);

        if (Boolean.TRUE.equals(producto.getEsUnico())) {
            producto.setVendido(true);
        }
        if (actDespues <= 0) {
            producto.setVisibleCatalogo(false);
            producto.setDestacado(false);
            if (producto.getFechaAgotado() == null) {
                producto.setFechaAgotado(LocalDateTime.now(Constants.ZONA_CR));
            }
        }
        productoRepository.save(producto);

        movimientoSupport.registrar(producto, tipo, cantidad,
            actAntes, actDespues,
            resAntes, resDespues,
            referencia, operadorCorreo);

        movimientoSupport.publicarCambioStock(source, producto, actDespues);

        log.info("Venta ({}) — producto id={} '{}': actual {} → {}, reservado {} → {}",
            tipo, producto.getId(), producto.getNombreProducto(),
            actAntes, actDespues, resAntes, resDespues);
    }
}
