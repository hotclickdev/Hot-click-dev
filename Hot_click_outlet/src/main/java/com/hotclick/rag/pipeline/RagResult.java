package com.hotclick.rag.pipeline;

import com.hotclick.service.ai.UsoTokens;
import com.hotclick.rag.dto.ProductoContexto;

import java.util.List;

/**
 * Resultado interno del pipeline RAG.
 * No se expone directamente al cliente — ShoppingAssistantService
 * lo convierte a ChatResponse.
 */
public record RagResult(
    String                respuesta,
    List<ProductoContexto> productosReferenciados,
    List<String>          categorias,
    List<String>          opts,
    int                   tokensEntrada,
    int                   tokensSalida,
    long                  tokensCacheLectura,
    long                  tokensCacheEscritura
) {
    /** Sin tokens de caché. */
    public RagResult(String respuesta, List<ProductoContexto> productosReferenciados,
                     List<String> categorias, List<String> opts, int tokensEntrada, int tokensSalida) {
        this(respuesta, productosReferenciados, categorias, opts, tokensEntrada, tokensSalida, 0L, 0L);
    }

    public UsoTokens uso() {
        return new UsoTokens(tokensEntrada, tokensSalida, tokensCacheLectura, tokensCacheEscritura);
    }

    /** Respuesta de contingencia cuando Claude o Gemini no están disponibles. */
    public static RagResult fallback() {
        return new RagResult(
            "Lo siento, estoy experimentando problemas para conectarme con el catálogo en este momento. " +
            "Por favor intentá de nuevo en unos minutos o contactanos directamente.",
            List.of(), List.of(), List.of(), 0, 0
        );
    }
}
