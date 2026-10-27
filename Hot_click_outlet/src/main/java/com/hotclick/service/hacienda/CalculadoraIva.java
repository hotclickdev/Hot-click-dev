package com.hotclick.service.hacienda;

import com.hotclick.model.Empresa;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
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
 * Descuentos: se reparten entre líneas en proporción al bruto (acumulado HALF_UP, suma exacta) y el IVA
 * se calcula sobre el neto. El envío va como OtrosCargos (sin IVA) y se suma tal cual.
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

    /**
     * Línea tal como va al XML. {@code montoTotal} = PrecioUnitario × Cantidad (sin IVA),
     * {@code descuento} en la misma base, {@code subTotal} = montoTotal − descuento, IVA sobre subTotal.
     * {@code total()} es exactamente lo que se le cobra al cliente por la línea.
     */
    public record LineaXml(long montoTotal, long descuento, long subTotal, long impuesto, String precioUnitario) {
        public long total() { return subTotal + impuesto; }
    }

    /** Totales de uno o varios pedidos tal como se declaran (y se cobran). */
    public record Resumen(long venta, long descuentos, long ventaNeta, long gravado, long exento,
                          long impuesto, long otrosCargos) {
        public long totalComprobante() { return ventaNeta + impuesto + otrosCargos; }
    }

    /** Reparte {@code descuento} (colones, con IVA si el precio lo incluye) entre las líneas y desglosa cada una. */
    public static List<LineaXml> desglosar(Empresa empresa, boolean facturaElectronica, List<Linea> lineas, long descuento) {
        List<LineaXml> out = new ArrayList<>();
        if (lineas == null || lineas.isEmpty()) return out;
        long brutoTotal = 0;
        for (Linea l : lineas) brutoTotal += l.precioUnitario() * l.cantidad();
        long desc = Math.max(0, Math.min(descuento, brutoTotal));
        boolean suma = sumaIvaAlPrecio(empresa, facturaElectronica);
        long acumBruto = 0;
        long asignado = 0;
        for (Linea l : lineas) {
            long bruto = l.precioUnitario() * l.cantidad();
            acumBruto += bruto;
            long hasta = brutoTotal == 0 ? 0 : BigDecimal.valueOf(desc).multiply(BigDecimal.valueOf(acumBruto))
                .divide(BigDecimal.valueOf(brutoTotal), 0, RoundingMode.HALF_UP).longValue();
            long d = hasta - asignado;
            asignado = hasta;
            out.add(lineaXml(suma, l, bruto, d));
        }
        return out;
    }

    private static LineaXml lineaXml(boolean suma, Linea l, long bruto, long d) {
        BigDecimal pct = l.porcentaje();
        boolean gravada = pct != null && pct.signum() > 0;
        if (suma || !gravada) {
            long sub = bruto - d;
            long imp = gravada ? ImpuestoLinea.de(sub, 1, pct).impuesto() : 0;
            return new LineaXml(bruto, d, sub, imp, String.valueOf(l.precioUnitario()));
        }
        // Precio con IVA incluido (tiquete simplificado o régimen tradicional): desglose inverso.
        long montoTotal = sinIva(bruto, pct);
        long neto = bruto - d;
        long sub = sinIva(neto, pct);
        String pu = l.cantidad() == 0 ? "0" : BigDecimal.valueOf(montoTotal)
            .divide(BigDecimal.valueOf(l.cantidad()), 5, RoundingMode.HALF_UP).toPlainString();
        return new LineaXml(montoTotal, montoTotal - sub, sub, neto - sub, pu);
    }

    private static long sinIva(long conIva, BigDecimal pct) {
        return BigDecimal.valueOf(conIva).multiply(CIEN).divide(CIEN.add(pct), 0, RoundingMode.HALF_UP).longValue();
    }

    /** IVA a sumar al cobro cuando hay descuento sobre esas líneas. */
    public static long ivaACobrar(Empresa empresa, boolean facturaElectronica, List<Linea> lineas, long descuento) {
        if (!sumaIvaAlPrecio(empresa, facturaElectronica) || lineas == null) return 0;
        long iva = 0;
        for (LineaXml x : desglosar(empresa, true, lineas, descuento)) iva += x.impuesto();
        return iva;
    }

    /** Líneas de un pedido para la calculadora (precio del momento y % IVA del producto). */
    public static List<Linea> lineasDe(com.hotclick.model.Pedido pedido) {
        List<Linea> out = new ArrayList<>();
        if (pedido.getItems() == null) return out;
        for (com.hotclick.model.PedidoItem it : pedido.getItems()) {
            long precio = it.getPrecioUnitarioMomento() != null ? it.getPrecioUnitarioMomento() : 0L;
            BigDecimal pct = it.getProducto() != null ? it.getProducto().getPorcentajeIva() : null;
            out.add(new Linea(precio, it.getCantidad() != null ? it.getCantidad() : 0, pct));
        }
        return out;
    }

    /** Resumen de los pedidos de un comprobante: misma cuenta que el XML y que el cobro. */
    public static Resumen resumen(Empresa empresa, boolean facturaElectronica, List<com.hotclick.model.Pedido> pedidos) {
        long venta = 0, desc = 0, gravado = 0, exento = 0, imp = 0, otros = 0;
        for (com.hotclick.model.Pedido p : pedidos) {
            List<Linea> lineas = lineasDe(p);
            List<LineaXml> xs = desglosar(empresa, facturaElectronica, lineas, descuentoDe(p));
            for (int i = 0; i < xs.size(); i++) {
                LineaXml x = xs.get(i);
                venta += x.montoTotal();
                desc += x.descuento();
                imp += x.impuesto();
                BigDecimal pct = lineas.get(i).porcentaje();
                if (pct != null && pct.signum() > 0) gravado += x.montoTotal(); else exento += x.montoTotal();
            }
            otros += envioDe(p);
        }
        return new Resumen(venta, desc, venta - desc, gravado, exento, imp, otros);
    }

    public static long descuentoDe(com.hotclick.model.Pedido p) {
        return p.getDescuentoTotal() != null ? Math.max(0, p.getDescuentoTotal()) : 0;
    }

    public static long envioDe(com.hotclick.model.Pedido p) {
        return p.getCostoEnvio() != null ? Math.max(0, p.getCostoEnvio()) : 0;
    }
}
