package com.hotclick.service.publicchat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Component
class PublicChatClaudeStreamer {

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private final ObjectMapper objectMapper;
    private final PublicChatPromptBuilder promptBuilder;
    private final PublicChatMockResponses mockResponses;

    PublicChatClaudeStreamer(ObjectMapper objectMapper,
                             PublicChatPromptBuilder promptBuilder,
                             PublicChatMockResponses mockResponses) {
        this.objectMapper = objectMapper;
        this.promptBuilder = promptBuilder;
        this.mockResponses = mockResponses;
    }

    public void streamClaudeResponse(Logger log, SseEmitter emitter, String userMessage,
                                     List<Map<String, Object>> productos,
                                     List<Map<String, Object>> history,
                                     String wa, String nombreTienda, boolean marketplace, String context,
                                     boolean isEnglish, boolean isGift,
                                     Long maxBudget, Set<String> negations,
                                     boolean afterHours, List<String> smartOpts, boolean mostrarFichas) {
        String systemPrompt = promptBuilder.buildSalesSystemPrompt(wa, nombreTienda, marketplace, context, productos,
            isEnglish, isGift, maxBudget, negations, afterHours, mostrarFichas);
        String fallback = mockResponses.generarRespuestaMock(productos, history, isEnglish);
        streamWithSystemPrompt(log, emitter, userMessage, history, systemPrompt, fallback, smartOpts);
    }

    public void streamAdvisor(Logger log, SseEmitter emitter, String userMessage,
                              Map<String, Object> ficha, List<Map<String, Object>> history,
                              String wa, String nombreTienda, boolean marketplace,
                              boolean isEnglish, boolean afterHours, List<String> smartOpts) {
        String systemPrompt = promptBuilder.buildAdvisorSystemPrompt(
            wa, nombreTienda, marketplace, ficha, isEnglish, afterHours);
        String fallback = mockResponses.generarRespuestaAsesor(ficha, isEnglish);
        streamWithSystemPrompt(log, emitter, userMessage, history, systemPrompt, fallback, smartOpts);
    }

    void streamWithSystemPrompt(Logger log, SseEmitter emitter, String userMessage,
                                List<Map<String, Object>> history, String systemPrompt,
                                String fallback, List<String> smartOpts) {
        try {
            List<Map<String, Object>> messages = messagesParaClaude(history, userMessage);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("max_tokens", 400);
            body.put("stream", true);
            body.put("system", systemPrompt);
            body.put("messages", messages);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

            HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> enviarDeltas(log, emitter, response, smartOpts))
                .exceptionally(ex -> {
                    enviarFallback(log, emitter, fallback, smartOpts, ex);
                    return null;
                });
        } catch (Exception e) {
            log.error("[Chat] Build request error: {}", e.getMessage());
            try { emitter.complete(); } catch (Exception ae) { log.debug("SSE complete error: {}", ae.getMessage()); }
        }
    }

    private List<Map<String, Object>> messagesParaClaude(List<Map<String, Object>> history, String userMessage) {
        List<Map<String, Object>> messages = new ArrayList<>();
        String lastRole = null;
        for (Map<String, Object> m : history) {
            String rol = String.valueOf(m.getOrDefault("rol", "")).trim();
            String texto = String.valueOf(m.getOrDefault("texto", "")).trim();
            if (texto.isBlank()) continue;
            String claudeRole = "assistant".equals(rol) || "bot".equals(rol) ? "assistant" : "user";
            if (claudeRole.equals(lastRole)) continue;
            messages.add(Map.of("role", claudeRole, "content", texto));
            lastRole = claudeRole;
        }
        if ("user".equals(lastRole) && !messages.isEmpty()) {
            messages.remove(messages.size() - 1);
        }
        messages.add(Map.of("role", "user", "content", userMessage));
        return messages;
    }

    private void enviarDeltas(Logger log, SseEmitter emitter, HttpResponse<Stream<String>> response,
                              List<String> smartOpts) {
        try {
            response.body().forEach(line -> enviarDeltaSiHay(log, emitter, line));
            emitter.send(SseEmitter.event().name("done")
                .data(objectMapper.writeValueAsString(Map.of("opts", smartOpts))));
            emitter.complete();
        } catch (Exception e) {
            log.error("[Chat] Stream processing error: {}", e.getMessage());
            try { emitter.complete(); } catch (Exception ae) { log.debug("SSE complete error: {}", ae.getMessage()); }
        }
    }

    private void enviarDeltaSiHay(Logger log, SseEmitter emitter, String line) {
        if (!line.startsWith("data: ")) return;
        try {
            JsonNode node = objectMapper.readTree(line.substring(6).trim());
            if (!"content_block_delta".equals(node.path("type").asText())) return;
            String text = node.path("delta").path("text").asText();
            if (text.isEmpty()) return;
            emitter.send(SseEmitter.event().name("delta")
                .data(objectMapper.writeValueAsString(Map.of("text", text))));
        } catch (Exception e) { log.debug("SSE delta error: {}", e.getMessage()); }
    }

    private void enviarFallback(Logger log, SseEmitter emitter, String fallback,
                                List<String> smartOpts, Throwable ex) {
        log.error("[Chat] Claude call failed: {}", ex.getMessage());
        try {
            emitter.send(SseEmitter.event().name("delta")
                .data(objectMapper.writeValueAsString(Map.of("text", fallback))));
            emitter.send(SseEmitter.event().name("done")
                .data(objectMapper.writeValueAsString(Map.of("opts", smartOpts))));
            emitter.complete();
        } catch (Exception e) { log.debug("SSE fallback error: {}", e.getMessage()); }
    }
}
