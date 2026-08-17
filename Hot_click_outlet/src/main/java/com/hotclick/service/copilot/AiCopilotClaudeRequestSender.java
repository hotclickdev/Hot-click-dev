package com.hotclick.service.copilot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Envío HTTP a Claude API — extraído bit-idéntico de {@link AiCopilotClaudeClient}.
 */
@Component
class AiCopilotClaudeRequestSender {

    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    /** @return null en timeout (caller reintenta). */
    HttpResponse<String> enviar(String requestBody) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(CLAUDE_URL))
            .timeout(Duration.ofSeconds(25))
            .header("Content-Type", "application/json")
            .header("x-api-key", claudeApiKey)
            .header("anthropic-version", "2023-06-01")
            .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
            .build();
        try {
            return HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException e) {
            return null;
        }
    }
}
