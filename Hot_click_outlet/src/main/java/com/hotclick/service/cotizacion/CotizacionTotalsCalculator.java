package com.hotclick.service.cotizacion;

import com.hotclick.model.Cotizacion;
import com.hotclick.model.CotizacionItem;
import org.springframework.stereotype.Component;

@Component
public class CotizacionTotalsCalculator {

    public void calcularTotales(Cotizacion c) {
        int subtotal = c.getItems().stream().mapToInt(CotizacionItem::getSubtotalLinea).sum();
        c.setSubtotal(subtotal);

        int iva = 0;
        if (Boolean.TRUE.equals(c.getAplicaIva())) {
            int pct = c.getPorcentajeIva() != null ? c.getPorcentajeIva() : 13;
            iva = subtotal * pct / 100;
        }
        c.setMontoIva(iva);
        c.setTotal(subtotal + iva);
    }
}
