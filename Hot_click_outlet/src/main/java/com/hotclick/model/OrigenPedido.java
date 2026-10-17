package com.hotclick.model;

import java.util.Locale;

/**
 * Valores permitidos de {@code hot_click_pedido_tb.origen}: exactamente los del CHECK
 * {@code chk_pedido_origen} (V25): {@code 'ONLINE','POS','MANUAL'}. Cualquier otro valor
 * hace fallar el INSERT en PostgreSQL (500), así que todo código que fije el origen usa esta clase.
 *
 * <ul>
 *   <li>{@link #ONLINE}: el comprador compra por la web (checkout con cuenta o de invitado).</li>
 *   <li>{@link #POS}: venta presencial en el local (caja POS, QR de caja, QR de mesa).</li>
 *   <li>{@link #MANUAL}: la registra el negocio o el admin a mano (pedido manual, Telegram, asignación).</li>
 * </ul>
 */
public enum OrigenPedido {
    ONLINE, POS, MANUAL;

    /** Valor a guardar en la columna. */
    public String codigo() {
        return name();
    }

    /**
     * Normaliza un origen recibido (DTO o alias históricos) a uno de los tres valores permitidos.
     * {@code null}/vacío devuelve {@code null} (el llamador conserva su valor por defecto).
     *
     * @throws IllegalArgumentException si el valor no corresponde a ningún origen conocido.
     */
    public static OrigenPedido normalizar(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return switch (valor.trim().toUpperCase(Locale.ROOT)) {
            case "ONLINE", "WEB", "TIENDA_WEB" -> ONLINE;
            case "POS", "QR" -> POS;
            case "MANUAL", "TELEGRAM", "ASIGNACION_MANUAL" -> MANUAL;
            default -> throw new IllegalArgumentException("Origen de pedido no válido: " + valor);
        };
    }
}
