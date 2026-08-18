package com.hotclick.service.copilot;

/**
 * Recorte de la respuesta del copilot (panel y Telegram).
 */
public final class AiCopilotTextoRespuesta {

    public static final String VACIA = "No pude generar una respuesta. Probá reformular la pregunta.";
    public static final int MAX_CHARS = 8_000;

    private AiCopilotTextoRespuesta() {}

    public static String normalizar(String texto, int maxChars) {
        if (texto == null || texto.isBlank()) return VACIA;
        if (texto.length() <= maxChars) return texto;
        return texto.substring(0, maxChars);
    }
}
