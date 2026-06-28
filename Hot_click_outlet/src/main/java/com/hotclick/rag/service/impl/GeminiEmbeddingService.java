package com.hotclick.rag.service.impl;

import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.rag.service.EmbeddingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * EmbeddingService backed by Gemini text-embedding-004 (768 dimensions, cosine similarity).
 *
 * Free tier limits: 1 500 req/day, 15 req/min.
 * The batch indexer inserts a configurable delay between calls (rag.indexer.batch-delay-ms)
 * to stay well under the per-minute cap. Event-driven calls are infrequent by nature.
 *
 * Retry policy: 2 attempts, 2 s apart. On second failure the exception propagates to
 * the caller, which must log and skip the product — never abort the full batch.
 *
 * Uses a single shared RestTemplate (not one per call like GeminiService) so the
 * underlying connection pool is reused across requests.
 */
// Reemplazado por VoyageEmbeddingService (V64). Conservado como referencia.
// @Service — desactivado para evitar conflicto de bean con VoyageEmbeddingService
public class GeminiEmbeddingService implements EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(GeminiEmbeddingService.class);

    private static final String EMBED_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=%s";
    private static final int  MAX_RETRIES    = 2;
    private static final long RETRY_DELAY_MS = 2_000L;

    @Value("${google.gemini.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public float[] generarEmbedding(String texto) {
        Exception lastException = null;
        for (int intento = 1; intento <= MAX_RETRIES; intento++) {
            try {
                return llamarApi(texto);
            } catch (Exception e) {
                lastException = e;
                if (intento < MAX_RETRIES) {
                    log.warn("[embedding] Intento {}/{} fallido — reintentando en {}ms. Causa: {}",
                        intento, MAX_RETRIES, RETRY_DELAY_MS, e.getMessage());
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IntegracionExternaException("gemini", IntegracionExternaException.Tipo.IO_ERROR,
                            "Interrumpido durante reintento de embedding", ie);
                    }
                }
            }
        }
        throw new IntegracionExternaException("gemini", IntegracionExternaException.Tipo.IO_ERROR,
            "Gemini embedding falló tras " + MAX_RETRIES + " intentos", lastException);
    }

    @SuppressWarnings("null") // URI.create() never returns null; IDE can't infer without JDK null annotations
    private float[] llamarApi(String texto) {
        Map<String, Object> body = Map.of(
            "model",   "models/text-embedding-004",
            "content", Map.of(
                "parts", List.of(Map.of("text", texto))
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // ParameterizedTypeReference evita el raw Map y las advertencias de unchecked cast.
        // URI.create() satisface el @NonNull que requiere el overload de exchange(URI, ...).
        ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
            java.net.URI.create(String.format(EMBED_URL, apiKey)),
            HttpMethod.POST,
            new HttpEntity<>(body, headers),
            new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        Map<String, Object> responseBody = resp.getBody();
        if (responseBody == null)
            throw new IntegracionExternaException("gemini", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Gemini devolvió cuerpo vacío");

        // Pattern matching (Java 16+) — sin cast explícito, sin unchecked warning
        if (!(responseBody.get("embedding") instanceof Map<?, ?> embeddingNode))
            throw new IntegracionExternaException("gemini", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Campo 'embedding' ausente en respuesta de Gemini");

        if (!(embeddingNode.get("values") instanceof List<?> values) || values.isEmpty())
            throw new IntegracionExternaException("gemini", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Campo 'values' vacío en respuesta de Gemini");

        float[] result = new float[values.size()];
        for (int i = 0; i < values.size(); i++) {
            // Jackson deserializa números JSON como Double; Number.floatValue() cubre ambos casos
            result[i] = ((Number) values.get(i)).floatValue();
        }
        return result;
    }
}
