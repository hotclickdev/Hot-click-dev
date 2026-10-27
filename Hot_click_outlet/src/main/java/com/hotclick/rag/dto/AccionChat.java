package com.hotclick.rag.dto;

/**
 * Botón que el chat muestra debajo de un mensaje del asistente.
 * {@code tipo}: {@code buscar} (navega al catálogo) o {@code whatsapp} (abre wa.me).
 * La URL la arma el backend; el frontend no decide qué contacto mostrar.
 */
public record AccionChat(String tipo, String label, String url) {
    public static final String BUSCAR = "buscar";
    public static final String WHATSAPP = "whatsapp";
}
