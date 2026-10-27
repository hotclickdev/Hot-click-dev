package com.hotclick.service.cotizacion;

import com.hotclick.model.Cotizacion;
import com.hotclick.model.CotizacionItem;
import org.springframework.stereotype.Component;

@Component
public class CotizacionTotalsCalculator {

    /** Totales con aritmética exacta: si exceden int, rechaza en vez de desbordar. */
    public void calcularTotales(Cotizacion c) {
        try {
            long subtotal = 0;
            for (CotizacionItem it : c.getItems()) {
                subtotal = Math.addExact(subtotal, (long) it.getSubtotalLinea());
            }
            long iva = 0;
            if (Boolean.TRUE.equals(c.getAplicaIva())) {
                int pct = c.getPorcentajeIva() != null ? c.getPorcentajeIva() : 13;
                iva = Math.multiplyExact(subtotal, (long) pct) / 100;
            }
            int total = Math.toIntExact(Math.addExact(subtotal, iva));
            c.setSubtotal(Math.toIntExact(subtotal));
            c.setMontoIva(Math.toIntExact(iva));
            c.setTotal(total);
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException("El total de la cotización excede el máximo permitido");
        }
    }
}
