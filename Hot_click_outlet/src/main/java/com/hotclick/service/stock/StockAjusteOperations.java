package com.hotclick.service.stock;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class StockAjusteOperations {

    private static final Logger log = LoggerFactory.getLogger(StockAjusteOperations.class);

    @Autowired private ProductoRepository productoRepository;
    @Autowired private MovimientoStockRepository movimientoStockRepository;
    @Autowired private StockMovimientoSupport movimientoSupport;

    /**
     * Ajuste manual de entrada (reposición de inventario).
     */
    @Transactional
    public void ajustarEntrada(Object source, Long productoId, int cantidad, String notas, String operadorCorreo) {
        Producto producto = productoRepository.findByIdForUpdate(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));
        if (producto.getEstado() != Constants.ESTADO_ACTIVO) {
            throw new IllegalStateException("Producto no activo");
        }
        int actAntes   = producto.getStockActual();
        int actDespues = actAntes + cantidad;
        producto.setStockActual(actDespues);
        productoRepository.save(producto);

        MovimientoStock m = movimientoSupport.buildMovimiento(producto, MovimientoStock.AJUSTE_ENTRADA, cantidad,
            actAntes, actDespues, producto.getStockReservado(), producto.getStockReservado(),
            "ajuste-manual", operadorCorreo);
        m.setNotas(notas);
        movimientoStockRepository.save(m);

        movimientoSupport.publicarCambioStock(source, producto, actDespues);

        log.info("Ajuste entrada — producto id={}: actual {} → {}", productoId, actAntes, actDespues);
    }

    /**
     * Fija stockActual a la existencia física contada (chequeo de inventario).
     * Registra AJUSTE_ENTRADA o AJUSTE_SALIDA según el delta contra el sistema.
     * Usado por el chequeo semanal del bot de Telegram.
     */
    @Transactional
    public void ajustarAExistencia(Object source, Long productoId, int cantidadReal, String referencia, String operadorCorreo) {
        Producto producto = productoRepository.findByIdForUpdate(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));
        if (producto.getEstado() != Constants.ESTADO_ACTIVO) {
            throw new IllegalStateException("Producto no activo");
        }
        int actAntes = producto.getStockActual();
        if (actAntes == cantidadReal) return;

        int delta = cantidadReal - actAntes;
        producto.setStockActual(cantidadReal);
        productoRepository.save(producto);

        MovimientoStock m = movimientoSupport.buildMovimiento(producto,
            delta > 0 ? MovimientoStock.AJUSTE_ENTRADA : MovimientoStock.AJUSTE_SALIDA,
            Math.abs(delta),
            actAntes, cantidadReal,
            producto.getStockReservado(), producto.getStockReservado(),
            referencia, operadorCorreo);
        m.setNotas("Conteo físico de inventario");
        movimientoStockRepository.save(m);

        movimientoSupport.publicarCambioStock(source, producto, cantidadReal);

        log.info("Ajuste a existencia — producto id={}: actual {} → {}", productoId, actAntes, cantidadReal);
    }
}
