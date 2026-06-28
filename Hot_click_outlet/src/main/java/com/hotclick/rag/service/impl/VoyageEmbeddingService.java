package com.hotclick.rag.service.impl;

import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.rag.service.EmbeddingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * EmbeddingService backed by Voyage AI voyage-3-lite (512 dimensions, cosine similarity).
 *
 * Free tier: 200M tokens/month, 3 req/s — generous for a small product catalog.
 * Recommended by Anthropic as embedding provider for Claude-based RAG pipelines.
 *
 * Retry policy: 2 attempts, 1 s apart. On failure the exception propagates so
 * VectorSearchService can fall back to keyword search.
 */
@Service
public class VoyageEmbeddingService implements EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(VoyageEmbeddingService.class);

    private static final String EMBED_URL      = "https://api.voyageai.com/v1/embeddings";
    private static final String MODEL          = "voyage-3-lite";
    private static final int    MAX_RETRIES    = 2;
    private static final long   RETRY_DELAY_MS = 1_000L;

    @Value("${voyage.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public float[] generarEmbedding(String texto) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("voyage.api-key no configurada — embeddings deshabilitados");
        }

        Exception lastException = null;
        for (int intento = 1; intento <= MAX_RETRIES; intento++) {
            try {
                return llamarApi(texto);
            } catch (Exception e) {
                lastException = e;
                if (intento < MAX_RETRIES) {
                    log.warn("[embedding] Voyage intento {}/{} fallido — reintentando en {}ms. Causa: {}",
                        intento, MAX_RETRIES, RETRY_DELAY_MS, e.getMessage());
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IntegracionExternaException("voyage", IntegracionExternaException.Tipo.IO_ERROR,
                            "Interrumpido durante reintento de embedding", ie);
                    }
                }
            }
        }
        throw new IntegracionExternaException("voyage", IntegracionExternaException.Tipo.IO_ERROR,
            "Voyage embedding falló tras " + MAX_RETRIES + " intentos", lastException);
    }

    private float[] llamarApi(String texto) {
        Map<String, Object> body = Map.of(
            "input",      List.of(texto),
            "model",      MODEL,
            "input_type", "document"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
            java.net.URI.create(EMBED_URL),
            HttpMethod.POST,
            new HttpEntity<>(body, headers),
            new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        Map<String, Object> responseBody = resp.getBody();
        if (responseBody == null)
            throw new IntegracionExternaException("voyage", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Voyage devolvió cuerpo vacío");

        if (!(responseBody.get("data") instanceof List<?> data) || data.isEmpty())
            throw new IntegracionExternaException("voyage", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Campo 'data' vacío en respuesta de Voyage");

        if (!(data.get(0) instanceof Map<?, ?> firstItem))
            throw new IntegracionExternaException("voyage", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Formato inesperado en data[0] de Voyage");

        if (!(firstItem.get("embedding") instanceof List<?> values) || values.isEmpty())
            throw new IntegracionExternaException("voyage", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Campo 'embedding' vacío en respuesta de Voyage");

        float[] result = new float[values.size()];
        for (int i = 0; i < values.size(); i++) {
            result[i] = ((Number) values.get(i)).floatValue();
        }
        return result;
    }
}
