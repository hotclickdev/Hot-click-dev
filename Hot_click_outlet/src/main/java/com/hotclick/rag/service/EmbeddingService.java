package com.hotclick.rag.service;

/**
 * Contract for generating dense vector embeddings from plain text.
 *
 * Implementations are responsible for retry logic and error propagation.
 * Callers (batch indexer, event listener) must catch RuntimeException and handle
 * failures gracefully — a single product failing must never abort the whole batch.
 */
public interface EmbeddingService {

    /**
     * Generates a dense embedding vector for the given text.
     *
     * @param texto Plain text to embed. Should be pre-built by
     *              {@code EmbeddingIndexerService.construirTextoIndexado()}.
     * @return float[] of length 768 (Gemini text-embedding-004 dimensions).
     * @throws RuntimeException if the underlying API call fails after exhausting retries.
     */
    float[] generarEmbedding(String texto);
}
