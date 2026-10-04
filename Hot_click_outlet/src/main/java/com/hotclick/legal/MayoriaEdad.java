package com.hotclick.legal;

/**
 * La plataforma no admite menores de 18 (Código Civil art. 37).
 * No se pide fecha de nacimiento: solo la declaración.
 */
public final class MayoriaEdad {

    public static final String CODIGO = "MAYORIA_EDAD_REQUERIDA";
    public static final String MENSAJE = "HotClick solo admite personas mayores de 18 años.";

    private MayoriaEdad() {}

    public static void exigir(Boolean declara) {
        if (!Boolean.TRUE.equals(declara)) {
            throw new IllegalArgumentException(MENSAJE);
        }
    }

    public static boolean desdeTexto(String raw) {
        if (raw == null) return false;
        String v = raw.trim();
        return "true".equalsIgnoreCase(v) || "1".equals(v) || "si".equalsIgnoreCase(v) || "sí".equalsIgnoreCase(v);
    }
}
