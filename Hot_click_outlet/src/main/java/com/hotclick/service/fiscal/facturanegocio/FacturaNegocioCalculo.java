package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.consola.QuincenaCalculo;
import com.hotclick.service.fiscal.ComisionEfectiva;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.fiscal.SituacionFiscal;
import com.hotclick.service.hacienda.CodigoCabys;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Reglas puras de la factura que el negocio le emite a HotClick (Fase 2): quincenas, plazos, a quién le corresponde
 * facturar y cuánto. Sin base de datos ni Spring, para probarlas sin contexto.
 */
public final class FacturaNegocioCalculo {

    /** Días hábiles para el mensaje receptor (DGT-R-063-2018, pendiente de verificar contra la norma vigente). */
    public static final int DIAS_HABILES_MENSAJE_RECEPTOR = 8;

    public record Periodo(LocalDate desde, LocalDate hasta) {}

    /** Ventas de un producto en la quincena, tal como vienen de la consulta agregada. */
    public record VentaProducto(Long productoId, String nombre, String cabys, long cantidad, long bruto) {}

    /** Línea del desglose que ve el negocio: lo que se le debe por ese producto y el CAByS sugerido. */
    public record LineaDesglose(Long productoId, String nombre, String cabys, boolean cabysValido, long cantidad,
                                long bruto, long monto) {}

    private FacturaNegocioCalculo() {}

    /** Quincena a la que pertenece un día (1–15 o 16–fin de mes). */
    public static Periodo quincenaDe(LocalDate dia) {
        return new Periodo(QuincenaCalculo.inicio(dia), QuincenaCalculo.fin(dia));
    }

    /** La quincena que ya cerró antes de {@code hoy} (el 1 → del 16 al fin del mes anterior; el 16 → del 1 al 15). */
    public static Periodo quincenaCerrada(LocalDate hoy) {
        return quincenaDe(QuincenaCalculo.inicio(hoy).minusDays(1));
    }

    /** Fin de la quincena más los días que da la regla (7 por defecto). */
    public static LocalDate fechaLimite(LocalDate hasta, int dias) {
        return hasta.plusDays(Math.max(0, dias));
    }

    public static long diasRestantes(LocalDate hoy, LocalDate limite) {
        return Math.max(0L, ChronoUnit.DAYS.between(hoy, limite));
    }

    /**
     * Solo el negocio INSCRITO y verificado por un ADMIN le factura a HotClick. Sin declarar, NO_INSCRITO, Régimen
     * Simplificado y lo declarado sin verificar pagan el recargo (misma regla de {@link ComisionEfectiva}) y no facturan.
     */
    public static boolean leCorrespondeFacturar(String situacionFiscal, boolean verificado) {
        SituacionFiscal s = SituacionFiscal.desde(situacionFiscal).orElse(null);
        return s == SituacionFiscal.INSCRITO && !ComisionEfectiva.pagaExtra(s, verificado);
    }

    /** NETO = productos menos la comisión de HotClick; BRUTO = precio de los productos. El envío nunca entra. */
    public static long monto(String base, long productos, long comision) {
        long p = Math.max(0L, productos);
        if (ConfiguracionFiscalService.BASE_BRUTO.equals(base)) return p;
        return Math.max(0L, p - Math.max(0L, comision));
    }

    /**
     * Reparte el monto adeudado entre los productos, en proporción a lo vendido de cada uno, con el método del mayor
     * residuo: la suma de las líneas es exactamente el monto (lo que el negocio debe facturar).
     */
    public static List<LineaDesglose> repartir(List<VentaProducto> ventas, long montoTotal) {
        List<LineaDesglose> salida = new ArrayList<>();
        if (ventas == null || ventas.isEmpty()) return salida;
        long totalBruto = 0;
        for (VentaProducto v : ventas) totalBruto += Math.max(0L, v.bruto());
        long[] montos = new long[ventas.size()];
        BigDecimal[] residuos = new BigDecimal[ventas.size()];
        long asignado = 0;
        for (int i = 0; i < ventas.size(); i++) {
            long bruto = Math.max(0L, ventas.get(i).bruto());
            BigDecimal exacto = totalBruto == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(montoTotal).multiply(BigDecimal.valueOf(bruto))
                    .divide(BigDecimal.valueOf(totalBruto), 6, RoundingMode.DOWN);
            montos[i] = exacto.setScale(0, RoundingMode.DOWN).longValue();
            residuos[i] = exacto.subtract(BigDecimal.valueOf(montos[i]));
            asignado += montos[i];
        }
        long faltante = totalBruto == 0 ? 0 : montoTotal - asignado;
        List<Integer> orden = new ArrayList<>();
        for (int i = 0; i < ventas.size(); i++) orden.add(i);
        orden.sort(Comparator.comparing((Integer i) -> residuos[i]).reversed().thenComparing(i -> i));
        for (int k = 0; k < faltante && k < orden.size(); k++) montos[orden.get(k)]++;
        for (int i = 0; i < ventas.size(); i++) {
            VentaProducto v = ventas.get(i);
            salida.add(new LineaDesglose(v.productoId(), v.nombre(), v.cabys(), CodigoCabys.valido(v.cabys()),
                v.cantidad(), Math.max(0L, v.bruto()), montos[i]));
        }
        return salida;
    }

    /**
     * Plazo del mensaje receptor: 8 días hábiles contados desde el primer día hábil del mes siguiente a la quincena
     * (ese primer día cuenta como el día 1). Solo cuenta lunes a viernes: los feriados no se descuentan, así que el
     * plazo real puede ser uno o dos días más largo. Regla pendiente de verificar (DGT-R-063-2018).
     */
    public static LocalDate plazoMensajeReceptor(LocalDate hasta) {
        LocalDate dia = hasta.withDayOfMonth(1).plusMonths(1);
        while (!habil(dia)) dia = dia.plusDays(1);
        int contados = 1;
        while (contados < DIAS_HABILES_MENSAJE_RECEPTOR) {
            dia = dia.plusDays(1);
            if (habil(dia)) contados++;
        }
        return dia;
    }

    static boolean habil(LocalDate d) {
        DayOfWeek dia = d.getDayOfWeek();
        return !DayOfWeek.SATURDAY.equals(dia) && !DayOfWeek.SUNDAY.equals(dia);
    }
}
