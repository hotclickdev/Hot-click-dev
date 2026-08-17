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
                                     String wa, String context,
                                     boolean isEnglish, boolean isGift,
                                     Long maxBudget, Set<String> negations,
                                     boolean afterHours, List<String> smartOpts) {
        try {
            String systemPrompt = promptBuilder.buildSalesSystemPrompt(wa, context, productos,
                isEnglish, isGift, maxBudget, negations, afterHours);

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
                .thenAccept(response -> {
                    try {
                        response.body().forEach(line -> {
                            if (line.startsWith("data: ")) {
                                String json = line.substring(6).trim();
                                try {
                                    JsonNode node = objectMapper.readTree(json);
                                    if ("content_block_delta".equals(node.path("type").asText())) {
                                        String text = node.path("delta").path("text").asText();
                                        if (!text.isEmpty()) {
                                            emitter.send(SseEmitter.event().name("delta")
                                                .data(objectMapper.writeValueAsString(Map.of("text", text))));
                                        }
                                    }
                                } catch (Exception e) { log.debug("SSE delta error: {}", e.getMessage()); }
                            }
                        });
                        emitter.send(SseEmitter.event().name("done")
                            .data(objectMapper.writeValueAsString(Map.of("opts", smartOpts))));
                        emitter.complete();
                    } catch (Exception e) {
                        log.error("[Chat] Stream processing error: {}", e.getMessage());
                        try { emitter.complete(); } catch (Exception ae) { log.debug("SSE complete error: {}", ae.getMessage()); }
                    }
                })
                .exceptionally(ex -> {
                    log.error("[Chat] Claude call failed: {}", ex.getMessage());
                    try {
                        String fallback = mockResponses.generarRespuestaMock(productos, history, isEnglish);
                        emitter.send(SseEmitter.event().name("delta")
                            .data(objectMapper.writeValueAsString(Map.of("text", fallback))));
                        emitter.send(SseEmitter.event().name("done")
                            .data(objectMapper.writeValueAsString(Map.of("opts", smartOpts))));
                        emitter.complete();
                    } catch (Exception e) { log.debug("SSE fallback error: {}", e.getMessage()); }
                    return null;
                });

        } catch (Exception e) {
            log.error("[Chat] Build request error: {}", e.getMessage());
            try { emitter.complete(); } catch (Exception ae) { log.debug("SSE complete error: {}", ae.getMessage()); }
        }
    }
}
