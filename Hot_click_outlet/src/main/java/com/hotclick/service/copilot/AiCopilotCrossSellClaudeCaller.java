package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

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
 * Llamada a Claude para cross-sell — extraído bit-idéntico de {@link AiCopilotCrossSellService}.
 */
@Component
class AiCopilotCrossSellClaudeCaller {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotCrossSellClaudeCaller.class);
    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String claudeModel;

    @Autowired private ObjectMapper objectMapper;

    String solicitarSugerencia(Long empresaId, Long clienteId, String datosPrompt) {
        String systemPrompt = """
            Sos el Copilot de HOTCLICK. Vas a redactar una sugerencia breve de cross-sell
            para que el dueño del negocio se la envíe a un cliente puntual por WhatsApp.
            Tono costarricense, cercano, natural — nunca corporativo. Elegí 2 o 3 productos
            como máximo de la lista de candidatos, explicá brevemente por qué le podrían
            interesar según lo que ya compró. Máximo 80 palabras. No inventés productos
            fuera de la lista.

            %s
            """.formatted(datosPrompt);

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", claudeModel);
            body.put("max_tokens", 300);
            body.put("system", systemPrompt);
            body.put("messages", List.of(Map.of("role", "user", "content", "Generá la sugerencia.")));

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(CLAUDE_URL))
                .timeout(Duration.ofSeconds(25))
                .header("Content-Type", "application/json")
                .header("x-api-key", claudeApiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("[AI-crosssell] empresaId={} clienteId={} Claude respondió {}", empresaId, clienteId, response.statusCode());
                return null;
            }
            JsonNode node = objectMapper.readTree(response.body());
            StringBuilder textoSb = new StringBuilder();
            for (JsonNode block : node.path("content")) {
                if ("text".equals(block.path("type").asText())) textoSb.append(block.path("text").asText(""));
            }
            String texto = textoSb.toString().trim();
            return texto.isBlank() ? null : texto;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.error("[AI-crosssell] empresaId={} clienteId={} fallo llamando a Claude — {}", empresaId, clienteId, e.getMessage());
            return null;
        }
    }
}
