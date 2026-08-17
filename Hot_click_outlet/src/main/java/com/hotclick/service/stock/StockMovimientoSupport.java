package com.hotclick.service.stock;

import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.sse.StockCambioEvent;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class StockMovimientoSupport {

    @Autowired private MovimientoStockRepository movimientoStockRepository;
    @Autowired private ApplicationEventPublisher eventPublisher;

    /**
     * Publica StockCambioEvent tras un cambio exitoso de stockActual.
     * El listener lo despacha vía SSE solo después del COMMIT de la transacción actual.
     */
    public void publicarCambioStock(Object source, Producto producto, int stockActualDespues) {
        eventPublisher.publishEvent(new StockCambioEvent(
            source, producto.getId(), producto.getEmpresaId(), stockActualDespues));
    }

    public void registrar(Producto producto, String tipo, int cantidad,
                          int actAntes, int actDespues,
                          int resAntes, int resDespues,
                          String referencia, String operadorCorreo) {
        movimientoStockRepository.save(
            buildMovimiento(producto, tipo, cantidad,
                actAntes, actDespues, resAntes, resDespues,
                referencia, operadorCorreo));
    }

    public MovimientoStock buildMovimiento(Producto producto, String tipo, int cantidad,
                                            int actAntes, int actDespues,
                                            int resAntes, int resDespues,
                                            String referencia, String operadorCorreo) {
        MovimientoStock m = new MovimientoStock();
        m.setProducto(producto);
        m.setTipoMovimiento(tipo);
        m.setTipo(tipo);
        m.setCantidad(cantidad);
        m.setStockActualAntes(actAntes);
        m.setStockActualDespues(actDespues);
        m.setStockReservadoAntes(resAntes);
        m.setStockReservadoDespues(resDespues);
        m.setReferencia(referencia);
        m.setOperadorCorreo(operadorCorreo);
        m.setFechaMovimiento(LocalDateTime.now(Constants.ZONA_CR));
        return m;
    }
}
