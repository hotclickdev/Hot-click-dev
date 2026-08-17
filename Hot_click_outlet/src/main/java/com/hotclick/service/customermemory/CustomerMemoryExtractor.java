package com.hotclick.service.customermemory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
class CustomerMemoryExtractor {

    private static final Logger log = LoggerFactory.getLogger(CustomerMemoryExtractor.class);

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private final ObjectMapper objectMapper;

    CustomerMemoryExtractor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    Map<String, Object> extractFromConversation(String userMsg, String assistantMsg) {
        try {
            String systemPrompt = """
                Sos un extractor de datos de cliente. A partir de un fragmento de conversación \
                de una tienda en Costa Rica, extraé información estructurada del cliente.
                Devolvé SOLO JSON válido con estos campos:
                - "interests": array de strings con categorías o productos mencionados (en español, minúsculas)
                - "brands": array de strings con marcas mencionadas o preferidas
                - "budget_colones": número entero en colones costarricenses o null
                - "summary": una oración en español resumiendo qué busca este cliente

                Si no hay información relevante, devolvé: {"interests":[],"brands":[],"budget_colones":null,"summary":""}
                NO incluyas explicaciones. SOLO el JSON.
                """;

            String userContent = "Conversación:\nUsuario: " + CustomerMemoryHelpers.truncate(userMsg, 300) +
                "\nAsistente: " + CustomerMemoryHelpers.truncate(assistantMsg, 300);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", 256);
            body.put("system",     systemPrompt);
            body.put("messages",   List.of(Map.of("role", "user", "content", userContent)));

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type",      "application/json")
                .header("x-api-key",         apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) return null;

            JsonNode json  = objectMapper.readTree(response.body());
            String   texto = json.path("content").path(0).path("text").asText("").trim();

            if (texto.isBlank()) return null;

            // Limpiar markdown si Claude envuelve en backticks
            texto = texto.replaceAll("^```json\\s*", "").replaceAll("```$", "").trim();

            JsonNode parsed = objectMapper.readTree(texto);
            Map<String, Object> result = new HashMap<>();

            JsonNode interestsNode = parsed.path("interests");
            if (interestsNode.isArray()) {
                List<String> list = new ArrayList<>();
                interestsNode.forEach(n -> { if (!n.asText().isBlank()) list.add(n.asText().toLowerCase()); });
                result.put("interests", list);
            }

            JsonNode brandsNode = parsed.path("brands");
            if (brandsNode.isArray()) {
                List<String> list = new ArrayList<>();
                brandsNode.forEach(n -> { if (!n.asText().isBlank()) list.add(n.asText()); });
                result.put("brands", list);
            }

            JsonNode budgetNode = parsed.path("budget_colones");
            if (!budgetNode.isNull() && budgetNode.isNumber()) {
                result.put("budget_colones", budgetNode.longValue());
            }

            String summary = parsed.path("summary").asText("");
            if (!summary.isBlank()) result.put("summary", summary);

            return result;

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.warn("[memory] Error en extracción Claude: {}", e.getMessage());
            return null;
        }
    }
}
