package com.hotclick.service.catalogo;

/**
 * Umbrales del ranking híbrido del chat de ventas (keyword + vector).
 */
public final class ChatRankingConstants {

    /**
     * Distancia coseno máxima ({@code <=>}) para aceptar un vecino de embedding.
     * Por encima: se descarta (evita recomendar productos sin relación).
     */
    public static final double CHAT_DISTANCIA_MAXIMA = 0.55;

    /** Constante RRF (Reciprocal Rank Fusion) al mezclar listas keyword + vector. */
    public static final int RRF_K = 60;

    private ChatRankingConstants() {}
}
