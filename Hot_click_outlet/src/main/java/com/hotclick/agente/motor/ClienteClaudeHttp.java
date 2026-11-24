package com.hotclick.agente.motor;

import com.hotclick.exception.IntegracionExternaException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
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
 * Cliente HTTP directo a la Messages API (mismo estilo que el copilot y el RAG: sin SDK).
 * Timeout por llamada, reintento y circuit breaker {@code claude} (configurados en application.properties).
 * Los errores no incluyen el cuerpo de la respuesta ni el request (pueden traer datos del cliente).
 */
@Component
public class ClienteClaudeHttp implements ClienteClaude {

    private static final String URL = "https://api.anthropic.com/v1/messages";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    private final String apiKey;
    private final Duration timeout;

    public ClienteClaudeHttp(@Value("${anthropic.api-key:}") String apiKey,
                             @Value("${agente.motor.timeout-segundos:25}") long timeoutSegundos) {
        this.apiKey = apiKey;
        this.timeout = Duration.ofSeconds(Math.max(5, timeoutSegundos));
    }

    @Override
    @Retry(name = "claude")
    @CircuitBreaker(name = "claude")
    public RespuestaClaude enviar(String cuerpoJson) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.DESCONOCIDO,
                "ANTHROPIC_API_KEY no configurada");
        }
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(URL))
            .timeout(timeout)
            .header("Content-Type", "application/json")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .POST(HttpRequest.BodyPublishers.ofString(cuerpoJson, StandardCharsets.UTF_8))
            .build();
        try {
            HttpResponse<String> r = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            int s = r.statusCode();
            if (s == 429) {
                throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.RATE_LIMIT, "Claude HTTP 429");
            }
            if (s >= 500) {
                throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.IO_ERROR, "Claude HTTP " + s);
            }
            return new RespuestaClaude(s, r.body());
        } catch (HttpTimeoutException e) {
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.TIMEOUT, "Timeout llamando a Claude", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.IO_ERROR, "Llamada a Claude interrumpida", e);
        } catch (IOException e) {
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.IO_ERROR, "Error de red llamando a Claude", e);
        }
    }
}
