package com.hotclick.rag.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.rag.dto.ProductoContexto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Llamada HTTP no-streaming a Claude para el pipeline RAG.
 * Extraído bit-idéntico de RagPipeline — no cambia comportamiento.
 */
final class RagClaudeCaller {

    private static final Logger log = LoggerFactory.getLogger(RagClaudeCaller.class);

    private RagClaudeCaller() {}

    static RagResult llamar(HttpClient http,
                            ObjectMapper objectMapper,
                            String apiKey,
                            String model,
                            int maxTokens,
                            String systemPrompt,
                            List<Map<String, Object>> messages,
                            List<ProductoContexto> productos,
                            List<String> categoriasDisponibles) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", maxTokens);
            body.put("stream",     false);
            body.put("system",     systemPrompt);
            body.put("messages",   messages);
            // Stop sequences previenen prompt injection
            body.put("stop_sequences", List.of("\n\nHuman:", "\n\nUser:", "Human:", "User:"));

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type",      "application/json")
                .header("x-api-key",         apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.IO_ERROR,
                    "Claude API HTTP " + response.statusCode() + ": " + response.body());
            }

            JsonNode json    = objectMapper.readTree(response.body());
            String   texto   = json.path("content").path(0).path("text").asText("").trim();
            int      tokIn   = json.path("usage").path("input_tokens").asInt(0);
            int      tokOut  = json.path("usage").path("output_tokens").asInt(0);

            if (texto.isBlank()) {
                log.warn("[rag] Claude devolvió respuesta vacía");
                return RagResult.fallback();
            }

            return RagPipelineSupport.parseClaudeText(texto, productos, tokIn, tokOut);

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.IO_ERROR,
                "Llamada a Claude interrumpida", ie);
        } catch (IntegracionExternaException re) {
            throw re;
        } catch (Exception e) {
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.IO_ERROR,
                "Error llamando a Claude: " + e.getMessage(), e);
        }
    }
}
