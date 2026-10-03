package com.hotclick.service.negocio;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Plan que el visitante puede ver de un negocio. Solo tres valores públicos; cualquier otro nombre interno
 * (GRATUITO, EMPRENDEDOR_PRO, nulo…) cuenta como {@code EMPRENDEDOR}, igual que en {@code ContactoPublicoPolicy}.
 */
public final class PlanPublico {

    public static final String EMPRENDEDOR = "EMPRENDEDOR";
    public static final String PYME = "PYME";
    public static final String NEGOCIO_PLUS = "NEGOCIO_PLUS";

    private PlanPublico() {}

    /** Plan efectivo de la empresa → plan público. */
    public static String de(String nombrePlan) {
        String n = clave(nombrePlan);
        if (PYME.equals(n)) return PYME;
        if (NEGOCIO_PLUS.equals(n)) return NEGOCIO_PLUS;
        return EMPRENDEDOR;
    }

    /**
     * Filtro que llega del visitante ({@code ?plan=}): acepta el valor público y los alias de la URL
     * ({@code emprendimientos}, {@code pymes}, {@code negocio-plus}). Vacío = sin filtro; desconocido = {@code null}.
     */
    public static String filtro(String valor) {
        if (valor == null || valor.isBlank()) return "";
        return switch (clave(valor)) {
            case "EMPRENDEDOR", "EMPRENDEDORES", "EMPRENDIMIENTO", "EMPRENDIMIENTOS" -> EMPRENDEDOR;
            case "PYME", "PYMES" -> PYME;
            case "NEGOCIO_PLUS", "NEGOCIOPLUS", "PLUS" -> NEGOCIO_PLUS;
            default -> null;
        };
    }

    private static String clave(String valor) {
        if (valor == null) return "";
        String sinTildes = Normalizer.normalize(valor.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }
}
