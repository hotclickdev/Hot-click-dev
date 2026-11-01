package com.hotclick.service.ai;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Tokens de una llamada a Claude: entrada, salida y caché (lectura / escritura).
 * Nunca negativos. Se construye desde el objeto {@code usage} de la respuesta de la API.
 */
public record UsoTokens(int entrada, int salida, long cacheLectura, long cacheEscritura) {

    public static final UsoTokens VACIO = new UsoTokens(0, 0, 0, 0);

    public UsoTokens {
        entrada = Math.max(0, entrada);
        salida = Math.max(0, salida);
        cacheLectura = Math.max(0, cacheLectura);
        cacheEscritura = Math.max(0, cacheEscritura);
    }

    public static UsoTokens de(int entrada, int salida) {
        return new UsoTokens(entrada, salida, 0, 0);
    }

    /** Lee {@code input_tokens}, {@code output_tokens}, {@code cache_read_input_tokens} y
     *  {@code cache_creation_input_tokens} de un nodo {@code usage}; ausente/null → VACIO. */
    public static UsoTokens desdeUsage(JsonNode usage) {
        if (usage == null || usage.isMissingNode() || usage.isNull()) return VACIO;
        return new UsoTokens(
            usage.path("input_tokens").asInt(0),
            usage.path("output_tokens").asInt(0),
            usage.path("cache_read_input_tokens").asLong(0),
            usage.path("cache_creation_input_tokens").asLong(0));
    }

    /** Suma componente a componente (varias vueltas de un loop con herramientas). */
    public UsoTokens mas(UsoTokens otro) {
        if (otro == null) return this;
        return new UsoTokens(entrada + otro.entrada, salida + otro.salida,
            cacheLectura + otro.cacheLectura, cacheEscritura + otro.cacheEscritura);
    }

    public boolean esVacio() {
        return entrada == 0 && salida == 0 && cacheLectura == 0 && cacheEscritura == 0;
    }
}
