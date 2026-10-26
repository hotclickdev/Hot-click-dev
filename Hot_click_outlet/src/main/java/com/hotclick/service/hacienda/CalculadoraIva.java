package com.hotclick.service.hacienda;

import com.hotclick.model.Empresa;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Set;

/**
 * Regla única de IVA para cobro (checkout y POS) y para el XML del comprobante.
 *
 * <ul>
 *   <li>SIMPLIFICADO (default): el precio de venta NO incluye IVA.
 *       Tiquete: se cobra el precio tal cual. Factura electrónica: se cobra precio + IVA de la línea.</li>
 *   <li>TRADICIONAL: el precio de venta ya incluye IVA; se cobra tal cual y el XML lo desglosa.</li>
 * </ul>
 * Todo en colones enteros con BigDecimal HALF_UP por línea, igual que {@link ImpuestoLinea}.
 */
public final class CalculadoraIva {

    public static final String SIMPLIFICADO = "SIMPLIFICADO";
    public static final String TRADICIONAL = "TRADICIONAL";
    public static final Set<String> REGIMENES = Set.of(SIMPLIFICADO, TRADICIONAL);

    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    private CalculadoraIva() {}

    public record Linea(long precioUnitario, int cantidad, BigDecimal porcentaje) {}

    public static String regimen(Empresa empresa) {
        String r = empresa != null ? empresa.getRegimenIva() : null;
        return TRADICIONAL.equals(r) ? TRADICIONAL : SIMPLIFICADO;
    }

    /** true si al precio de catálogo hay que sumarle el IVA al cobrar. */
    public static boolean sumaIvaAlPrecio(Empresa empresa, boolean facturaElectronica) {
        return facturaElectronica && SIMPLIFICADO.equals(regimen(empresa));
    }

    /** Base e impuesto de una línea tal como se declaran en el XML; total() es lo que se cobra por la línea. */
    public static ImpuestoLinea.Montos linea(Empresa empresa, boolean facturaElectronica, Linea l) {
        if (sumaIvaAlPrecio(empresa, facturaElectronica)) {
            return ImpuestoLinea.de(l.precioUnitario(), l.cantidad(), l.porcentaje());
        }
        long total = l.precioUnitario() * l.cantidad();
        BigDecimal pct = l.porcentaje();
        if (pct == null || pct.signum() <= 0) {
            return new ImpuestoLinea.Montos(total, 0);
        }
        long base = BigDecimal.valueOf(total).multiply(CIEN)
            .divide(CIEN.add(pct), 0, RoundingMode.HALF_UP).longValue();
        return new ImpuestoLinea.Montos(base, total - base);
    }

    /** IVA que se suma al cobro (0 si el precio ya se cobra tal cual). */
    public static long ivaACobrar(Empresa empresa, boolean facturaElectronica, List<Linea> lineas) {
        if (!sumaIvaAlPrecio(empresa, facturaElectronica) || lineas == null) return 0;
        long iva = 0;
        for (Linea l : lineas) iva += linea(empresa, true, l).impuesto();
        return iva;
    }

    /** Total del comprobante (suma de MontoTotalLinea) para estas líneas. */
    public static long totalComprobante(Empresa empresa, boolean facturaElectronica, List<Linea> lineas) {
        long total = 0;
        for (Linea l : lineas) total += linea(empresa, facturaElectronica, l).total();
        return total;
    }
}
