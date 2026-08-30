package com.hotclick.utils;

/**
 * Allowlist de contextos que el cliente puede mandar a los asesores de IA.
 * Cualquier otro valor se trata como GENERAL para no inyectar instrucciones
 * libres en el system prompt.
 */
public final class ChatContextoPermitido {

    public static final String GENERAL = "GENERAL";
    public static final int MAX_CHARS = 500;

    private static final String[] PREFIJOS = {
        "PRODUCTO:", "CARRITO:", "PAGO_EXITO", "PAGO_FALLO"
    };

    private ChatContextoPermitido() {}

    /**
     * @return el contexto original si el prefijo es conocido, si no {@link #GENERAL}
     */
    public static String normalizar(String raw) {
        if (raw == null || raw.isBlank()) return GENERAL;
        String texto = raw.trim();
        if (texto.length() > MAX_CHARS) {
            texto = texto.substring(0, MAX_CHARS);
        }
        if (GENERAL.equals(texto)) return GENERAL;
        for (String prefijo : PREFIJOS) {
            if (texto.startsWith(prefijo)) return texto;
        }
        return GENERAL;
    }
}
