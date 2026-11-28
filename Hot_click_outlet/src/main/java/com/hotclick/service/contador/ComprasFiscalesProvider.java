package com.hotclick.service.contador;

import java.time.YearMonth;

/**
 * Compras de HotClick a los negocios (facturas del negocio a HotClick) agregadas por mes. La Fase 2
 * ({@code hot_click_factura_negocio_tb}, facturas ACEPTADA con total e IVA) las alimentará: mientras no esté en
 * master, {@link ComprasFiscalesVacio} responde sin compras.
 *
 * <p>Una implementación devuelve solo totales de plataforma (nunca filas por negocio) y no debe hacer una consulta
 * por negocio: agrega en SQL.
 */
public interface ComprasFiscalesProvider {

    /**
     * Totales en colones de un mes. {@code comprasConCredito} son facturas ACEPTADA con IVA acreditable;
     * {@code comprasSinCredito} el resto (negocio no inscrito, RTS o sin factura válida).
     */
    record ResumenCompras(long comprasConCredito, long comprasSinCredito, long ivaAcreditable, boolean hayDatos) {
        public static final ResumenCompras SIN_DATOS = new ResumenCompras(0, 0, 0, false);

        public long total() { return comprasConCredito + comprasSinCredito; }

        public ResumenCompras mas(ResumenCompras o) {
            return new ResumenCompras(comprasConCredito + o.comprasConCredito, comprasSinCredito + o.comprasSinCredito,
                ivaAcreditable + o.ivaAcreditable, hayDatos || o.hayDatos);
        }
    }

    ResumenCompras mes(YearMonth mes);

    /** Los 12 meses del año en una sola pasada (índice 0 = enero). */
    default ResumenCompras[] anio(int anio) {
        ResumenCompras[] r = new ResumenCompras[12];
        for (int m = 1; m <= 12; m++) r[m - 1] = mes(YearMonth.of(anio, m));
        return r;
    }
}
