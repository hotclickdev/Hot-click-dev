package com.hotclick.service.contador;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Cálculos fiscales puros (sin base de datos ni IA), en colones enteros. Todo lo que el Contador muestra como
 * cifra sale de acá o de los comprobantes: la IA nunca calcula un monto por su cuenta.
 */
public final class ContadorCalculos {

    private ContadorCalculos() {}

    /** Tarifa general del IVA. */
    public static final BigDecimal IVA_PCT = new BigDecimal("13");
    /** Ingreso bruto anual que separa las tarifas reducidas de renta (5 a 20 %) de la tarifa del 30 %. */
    public static final long UMBRAL_RENTA_REDUCIDA_CRC = 119_174_000L;
    /** Tope anual de compras del Régimen de Tributación Simplificada: 186 salarios base. */
    public static final int SALARIOS_BASE_TOPE_RTS = 186;
    /** Recargo vigente que se compara con el piso (13/113). */
    public static final BigDecimal PISO_RECARGO_SIN_CREDITO_PCT = pct(IVA_PCT, IVA_PCT.add(new BigDecimal("100")), RoundingMode.CEILING);

    public enum Vendedor { INSCRITO, RTS, NO_INSCRITO }

    public record Progreso(long valor, long tope, BigDecimal pct, boolean superado, long restante) {}

    public record Iva150(long ventasBase, long ivaVentas, long comprasBase, long ivaAcreditable,
                         long comprasConCredito, long comprasSinCredito, long ivaAPagar, long saldoAFavor) {}

    public record Calculadora(long precio, Vendedor vendedor, boolean daCredito, long ivaSinCredito, long ivaConCredito,
                              long ivaEfectivo, BigDecimal recargoRecomendadoPct, BigDecimal recargoActualPct,
                              BigDecimal diferenciaPuntos, boolean recargoCubre, List<String> notas) {}

    /** {@code parte/total} en % con 2 decimales. */
    private static BigDecimal pct(BigDecimal parte, BigDecimal total, RoundingMode modo) {
        return parte.multiply(new BigDecimal("100")).divide(total, 2, modo);
    }

    public static long topeAnualRts(int salarioBaseCrc) {
        return (long) SALARIOS_BASE_TOPE_RTS * Math.max(0, salarioBaseCrc);
    }

    public static Progreso progreso(long valor, long tope) {
        long v = Math.max(0, valor);
        BigDecimal p = tope <= 0 ? BigDecimal.ZERO
            : BigDecimal.valueOf(v).multiply(new BigDecimal("100")).divide(BigDecimal.valueOf(tope), 1, RoundingMode.HALF_UP);
        return new Progreso(v, tope, p, tope > 0 && v > tope, Math.max(0, tope - v));
    }

    /** IVA de la declaración del mes: débito de ventas menos crédito de compras con factura aceptada. */
    public static Iva150 iva150(long ventasBase, long ivaVentas, ComprasFiscalesProvider.ResumenCompras compras) {
        long neto = ivaVentas - compras.ivaAcreditable();
        return new Iva150(ventasBase, ivaVentas, compras.total(), compras.ivaAcreditable(), compras.comprasConCredito(),
            compras.comprasSinCredito(), Math.max(0, neto), Math.max(0, -neto));
    }

    /** Trimestre (1 a 4) de un mes (1 a 12). */
    public static int trimestre(int mes) { return (mes - 1) / 3 + 1; }

    public record CuotaRts(long iva, long renta, long total) {}

    /**
     * Cuota del trimestre en RTS: compras del trimestre (IVA incluido) por el factor de IVA y por el de renta de la
     * actividad. Null si falta algún factor: no se inventa (los factores los configura el dueño).
     */
    public static CuotaRts cuotaRts(long comprasTrimestre, BigDecimal factorIva, BigDecimal factorRenta) {
        if (factorIva == null || factorRenta == null) return null;
        BigDecimal c = BigDecimal.valueOf(Math.max(0, comprasTrimestre));
        long iva = c.multiply(factorIva).setScale(0, RoundingMode.HALF_UP).longValueExact();
        long renta = c.multiply(factorRenta).setScale(0, RoundingMode.HALF_UP).longValueExact();
        return new CuotaRts(iva, renta, iva + renta);
    }

    /** Renta por tramos sobre una renta neta anual (para tablas de referencia); null si los tramos no son válidos. */
    public static Long rentaPorTramos(long rentaNeta, List<ContadorParametrosService.Tramo> tramos) {
        if (tramos == null || tramos.isEmpty()) return null;
        BigDecimal impuesto = BigDecimal.ZERO;
        long previo = 0;
        for (ContadorParametrosService.Tramo t : tramos) {
            long techo = t.hasta() == null ? Long.MAX_VALUE : t.hasta();
            long enTramo = Math.min(Math.max(0, rentaNeta), techo) - previo;
            if (enTramo > 0) impuesto = impuesto.add(BigDecimal.valueOf(enTramo).multiply(t.tasaPct()).divide(new BigDecimal("100")));
            previo = techo;
            if (rentaNeta <= techo) break;
        }
        return impuesto.setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    /**
     * Calculadora de recargo. El precio es el que paga el comprador con IVA incluido; el IVA contenido es 13/113.
     * Con crédito (negocio inscrito con factura aceptada) HotClick acredita el IVA de su compra, así que solo paga el
     * IVA del margen; sin crédito paga todo el IVA y el recargo debe cubrirlo (piso 13/113).
     *
     * @param margenPct margen de HotClick sobre el precio (0 a 100); con crédito, el IVA a pagar es el del margen.
     */
    public static Calculadora calculadora(long precio, Vendedor vendedor, BigDecimal margenPct, BigDecimal recargoActualPct) {
        if (precio <= 0 || precio > 1_000_000_000L) throw new IllegalArgumentException("precio fuera de rango");
        if (vendedor == null) throw new IllegalArgumentException("tipo de vendedor inválido");
        BigDecimal margen = margenPct == null ? BigDecimal.ZERO : margenPct;
        if (margen.signum() < 0 || margen.compareTo(new BigDecimal("100")) > 0) throw new IllegalArgumentException("margen fuera de rango");
        BigDecimal actual = recargoActualPct == null ? BigDecimal.ZERO : recargoActualPct;

        BigDecimal p = BigDecimal.valueOf(precio);
        BigDecimal ivaTotal = p.multiply(IVA_PCT).divide(IVA_PCT.add(new BigDecimal("100")), 6, RoundingMode.HALF_UP);
        long ivaSinCredito = ivaTotal.setScale(0, RoundingMode.HALF_UP).longValueExact();
        long ivaConCredito = ivaTotal.multiply(margen).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP).longValueExact();
        boolean daCredito = vendedor == Vendedor.INSCRITO;
        long efectivo = daCredito ? ivaConCredito : ivaSinCredito;

        BigDecimal recomendado = BigDecimal.valueOf(efectivo).multiply(new BigDecimal("100"))
            .divide(p, 2, RoundingMode.CEILING);
        BigDecimal diferencia = actual.subtract(recomendado).setScale(2, RoundingMode.HALF_UP);

        List<String> notas = new ArrayList<>();
        if (daCredito) {
            notas.add("Con factura aceptada del negocio, HotClick acredita su IVA y solo paga el IVA de su margen.");
        } else if (vendedor == Vendedor.RTS) {
            notas.add("Las compras a un negocio del Régimen Simplificado no dan crédito de IVA (confirmalo con Hacienda).");
        } else {
            notas.add("Sin inscripción no hay factura con IVA acreditable. Si aplica la factura electrónica de compra "
                + "es una consulta abierta (ver «Confirmar con Hacienda»).");
        }
        notas.add("El piso del recargo es 13/113 = " + PISO_RECARGO_SIN_CREDITO_PCT.toPlainString().replace('.', ',')
            + " % del precio con IVA incluido; cubre el IVA, no la renta.");
        return new Calculadora(precio, vendedor, daCredito, ivaSinCredito, ivaConCredito, efectivo, recomendado, actual,
            diferencia, diferencia.signum() >= 0, List.copyOf(notas));
    }

    public static Vendedor vendedorDe(String texto) {
        if (texto == null) return null;
        try {
            return Vendedor.valueOf(texto.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
