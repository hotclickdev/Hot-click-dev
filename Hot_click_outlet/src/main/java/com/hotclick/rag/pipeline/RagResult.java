package com.hotclick.rag.pipeline;

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
    int                   tokensEntrada,
    int                   tokensSalida
) {
    /** Respuesta de contingencia cuando Claude o Gemini no están disponibles. */
    static RagResult fallback() {
        return new RagResult(
            "Lo siento, estoy experimentando problemas para conectarme con el catálogo en este momento. " +
            "Por favor intentá de nuevo en unos minutos o contactanos directamente.",
            List.of(), List.of(), 0, 0
        );
    }
}
