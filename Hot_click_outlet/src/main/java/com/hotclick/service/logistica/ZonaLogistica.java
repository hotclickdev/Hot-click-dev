package com.hotclick.service.logistica;

/**
 * Cobertura de mensajería HOTCLICK para vendedores.
 * Fuera de la GAM está en desarrollo y no se acepta todavía.
 */
public final class ZonaLogistica {

    public static final String GAM = "GAM";
    public static final String FUERA_GAM = "FUERA_GAM";
    public static final String MSG_SOLO_GAM =
            "Por ahora solo recolectamos y entregamos en la GAM. Fuera de la GAM está en desarrollo.";

    private ZonaLogistica() {}

    public static void exigirGam(String zona) {
        if (!GAM.equals(zona)) {
            throw new IllegalArgumentException(MSG_SOLO_GAM);
        }
    }
}
