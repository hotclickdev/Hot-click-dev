package com.hotclick.service.envio;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * A-2: clasifica el destino en GAM o fuera del GAM en el servidor (misma lista que {@code ubicacionesCR.ts}).
 * Provincia o cantón ausente o desconocido: fuera del GAM (el monto más alto, a favor del negocio).
 */
public final class ZonaEnvio {

    private ZonaEnvio() {}

    private static final Map<String, Set<String>> CANTONES_GAM = Map.of(
        "san jose", Set.of("san jose", "escazu", "desamparados", "aserri", "mora", "goicoechea", "santa ana",
            "alajuelita", "vazquez de coronado", "tibas", "moravia", "montes de oca", "curridabat"),
        "alajuela", Set.of("alajuela", "atenas", "poas"),
        "cartago", Set.of("cartago", "paraiso", "la union", "alvarado", "oreamuno", "el guarco"),
        "heredia", Set.of("heredia", "barva", "santo domingo", "santa barbara", "san rafael", "san isidro",
            "belen", "flores", "san pablo"));

    public static boolean esGam(String provincia, String canton) {
        if (provincia == null || canton == null) return false;
        Set<String> cantones = CANTONES_GAM.get(normalizar(provincia));
        return cantones != null && cantones.contains(normalizar(canton));
    }

    static String normalizar(String v) {
        String sin = Normalizer.normalize(v, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sin.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
