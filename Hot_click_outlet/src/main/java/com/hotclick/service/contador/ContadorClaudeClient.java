package com.hotclick.service.contador;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.ai.UsoTokens;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
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
 * Llamada a Claude (Messages API) del Contador IA, con herramientas. Usa la misma configuracion que el resto del repo
 * ({@code anthropic.api-key} y {@code anthropic.model}); no agrega llaves ni proveedores. Es el unico punto que habla con
 * la API: los tests lo reemplazan por un doble.
 */
@Component
public class ContadorClaudeClient {

    /** Un turno de la respuesta: bloques de contenido, motivo de parada y tokens. */
    public record Turno(JsonNode content, String stopReason, UsoTokens uso) {}

    private static final String URL = "https://api.anthropic.com/v1/messages";
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String modelo;

    private final ObjectMapper mapper;

    public ContadorClaudeClient(ObjectMapper mapper) { this.mapper = mapper; }

    public boolean disponible() { return apiKey != null && !apiKey.isBlank(); }

    public String modelo() { return modelo; }

    public Turno enviar(String system, List<Map<String, Object>> mensajes, List<Map<String, Object>> herramientas,
                        int maxTokens) throws IOException, InterruptedException {
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("model", modelo);
        cuerpo.put("max_tokens", maxTokens);
        cuerpo.put("system", system);
        cuerpo.put("messages", mensajes);
        if (herramientas != null && !herramientas.isEmpty()) cuerpo.put("tools", herramientas);
        HttpRequest req = HttpRequest.newBuilder().uri(URI.create(URL)).timeout(Duration.ofSeconds(45))
            .header("Content-Type", "application/json").header("x-api-key", apiKey).header("anthropic-version", "2023-06-01")
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(cuerpo), StandardCharsets.UTF_8)).build();
        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != 200) {
            // Sin el cuerpo: puede repetir la pregunta del dueno.
            throw new IOException("Claude respondio " + resp.statusCode());
        }
        JsonNode raiz = mapper.readTree(resp.body());
        return new Turno(raiz.path("content"), raiz.path("stop_reason").asText(""), UsoTokens.desdeUsage(raiz.path("usage")));
    }
}
