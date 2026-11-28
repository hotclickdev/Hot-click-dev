package com.hotclick.service.contador;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Calendario de obligaciones según el régimen. Puro: recibe la fecha de hoy y no toca la base de datos. Si una fecha
 * cae en fin de semana se corre al lunes; los feriados no se modelan (por eso cada evento trae {@code verificar}).
 */
public final class ContadorCalendario {

    private ContadorCalendario() {}

    public static final String SIMPLIFICADO = "SIMPLIFICADO";
    public static final String TRADICIONAL = "TRADICIONAL";
    public static final int HORIZONTE_DIAS = 120;

    public record Evento(String clave, String tipo, String titulo, String detalle, LocalDate fecha, LocalDate fechaNominal,
                         boolean corridoPorFinDeSemana, long diasRestantes, boolean verificar) {}

    public static List<Evento> eventos(String regimen, LocalDate hoy, int diasEnviarFactura, Map<String, String> param) {
        boolean trad = TRADICIONAL.equals(regimen);
        LocalDate limite = hoy.plusDays(HORIZONTE_DIAS);
        List<Evento> out = new ArrayList<>();
        int diaInf = entero(param, ContadorParametrosService.DIA_INFORMATIVA);
        int diaRet = entero(param, ContadorParametrosService.DIA_RETENCIONES);
        int diaRts = entero(param, ContadorParametrosService.RTS_DIA_LIMITE);
        String formInf = param.getOrDefault(ContadorParametrosService.FORMULARIO_INFORMATIVA, "");
        String formRts = param.getOrDefault(ContadorParametrosService.RTS_FORMULARIO, "");
        YearMonth desde = YearMonth.from(hoy).minusMonths(1);
        for (int i = 0; i < 7; i++) {
            YearMonth ym = desde.plusMonths(i);
            if (trad) {
                agregar(out, "F150", "IVA mensual (formulario 150)",
                    "Declaración y pago del IVA del mes anterior en TRIBU-CR. Si el día no es hábil, pasa al siguiente hábil.",
                    ym.atDay(15), hoy, limite, true);
                agregar(out, "RETENCIONES", "Retenciones",
                    "Declaración y pago de retenciones del mes anterior.", ym.atDay(diaRet), hoy, limite, true);
            }
            agregar(out, "INFORMATIVA", "Declaración informativa" + (formInf.isBlank() ? "" : " (" + formInf + ")"),
                "Vence el día " + diaInf + " de cada mes. Configurá el formulario en los parámetros si falta.",
                ym.atDay(diaInf), hoy, limite, true);
            if (!trad && ym.getMonthValue() % 3 == 1) {
                agregar(out, "RTS_TRIMESTRAL", "Declaración trimestral del Régimen Simplificado"
                    + (formRts.isBlank() ? "" : " (" + formRts + ")"),
                    "Dentro de los primeros " + diaRts + " días de enero, abril, julio y octubre, por el trimestre que cerró.",
                    ym.atDay(diaRts), hoy, limite, true);
            }
            // Facturas de los negocios: N días después de cada quincena (15 y último día del mes).
            agregar(out, "FACTURA_NEGOCIOS", "Facturas de los negocios (quincena del 1 al 15)",
                "Cada negocio debe enviar su factura a HotClick dentro de " + diasEnviarFactura + " días del cierre de la quincena.",
                ym.atDay(15).plusDays(diasEnviarFactura), hoy, limite, false);
            agregar(out, "FACTURA_NEGOCIOS", "Facturas de los negocios (quincena del 16 al fin de mes)",
                "Cada negocio debe enviar su factura a HotClick dentro de " + diasEnviarFactura + " días del cierre de la quincena.",
                ym.atEndOfMonth().plusDays(diasEnviarFactura), hoy, limite, false);
        }
        if (trad) {
            boolean ordinario = !"ENE_DIC".equals(param.get(ContadorParametrosService.PERIODO_RENTA));
            for (int anio = hoy.getYear(); anio <= hoy.getYear() + 1; anio++) {
                LocalDate f = ordinario ? LocalDate.of(anio, 12, 15) : LocalDate.of(anio, 3, 15);
                agregar(out, "RENTA", "Declaración de renta (formulario 102)",
                    ordinario ? "Período ordinario octubre a setiembre; la declaración se presenta en diciembre."
                        : "Período especial enero a diciembre; la declaración vence el 15 de marzo.",
                    f, hoy, limite, true);
                String pct = param.getOrDefault(ContadorParametrosService.PAGOS_PARCIALES_PCT, "25");
                String fechas = param.getOrDefault(ContadorParametrosService.PAGOS_PARCIALES, "");
                if (!fechas.isBlank()) {
                    for (String fm : fechas.split(",")) {
                        String[] dm = fm.trim().split("-");
                        YearMonth ymp = YearMonth.of(anio, Integer.parseInt(dm[1]));
                        LocalDate fp = ymp.atDay(Math.min(Integer.parseInt(dm[0]), ymp.lengthOfMonth()));
                        agregar(out, "PAGO_PARCIAL", "Pago parcial de renta (" + pct + " %)",
                            "Pago a cuenta de renta, en tradicional.", fp, hoy, limite, true);
                    }
                }
            }
        }
        out.sort(Comparator.comparing(Evento::fecha).thenComparing(Evento::tipo));
        return List.copyOf(out);
    }

    private static int entero(Map<String, String> p, String clave) {
        try {
            return Integer.parseInt(p.getOrDefault(clave, ContadorParametrosService.defecto(clave)));
        } catch (NumberFormatException e) {
            return Integer.parseInt(ContadorParametrosService.defecto(clave));
        }
    }

    /** Primer evento que vence en {@code tipo} desde hoy, o null. */
    public static Evento proximo(List<Evento> eventos, String tipo) {
        return eventos.stream().filter(e -> e.tipo().equals(tipo)).findFirst().orElse(null);
    }

    private static void agregar(List<Evento> out, String tipo, String titulo, String detalle, LocalDate nominal,
                                LocalDate hoy, LocalDate limite, boolean verificar) {
        LocalDate fecha = corrida(nominal);
        if (fecha.isBefore(hoy) || fecha.isAfter(limite)) return;
        String clave = tipo + ":" + nominal;
        if (out.stream().anyMatch(e -> e.clave().equals(clave))) return;
        out.add(new Evento(clave, tipo, titulo, detalle, fecha, nominal, !fecha.equals(nominal),
            ChronoUnit.DAYS.between(hoy, fecha), verificar));
    }

    static LocalDate corrida(LocalDate f) {
        if (f.getDayOfWeek() == DayOfWeek.SATURDAY) return f.plusDays(2);
        if (f.getDayOfWeek() == DayOfWeek.SUNDAY) return f.plusDays(1);
        return f;
    }
}
