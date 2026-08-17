package com.hotclick.service.incident;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class IncidentClaudeClient {

    private static final Logger log = LoggerFactory.getLogger(IncidentClaudeClient.class);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${anthropic.api-key:}")
    private String anthropicKey;

    @Value("${anthropic.model:claude-sonnet-4-6}")
    private String model;

    private final ObjectMapper objectMapper;

    public IncidentClaudeClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public boolean hasApiKey() {
        return anthropicKey != null && !anthropicKey.isBlank();
    }

    public String llamarClaude(String titulo, String nivel, String culprit, String stackTrace,
                               String filePath, String contenido) {
        try {
            boolean esFrontend = filePath.contains(".jsx") || filePath.contains(".js") || filePath.contains(".tsx");
            String systemPrompt = esFrontend ? """
                    Eres un experto en React/JavaScript especializado en debugging de errores de consola y red en producción.
                    Cuando recibas un error de Sentry con el código fuente afectado, debes:
                    1. Analizar el error (puede ser error de consola, red, o excepción no manejada)
                    2. Proponer el código corregido completo del archivo JSX/JS (no solo el fragmento)
                    3. Explicar brevemente qué cambió y por qué

                    Errores comunes de red: fetch/axios sin manejo de error, status codes no validados, CORS.
                    Errores de consola: TypeError, undefined properties, null access, hooks mal usados.

                    Responde SIEMPRE en este formato JSON exacto:
                    {
                      "analisis": "descripción del problema en español",
                      "causa_raiz": "causa raíz específica en español",
                      "descripcion_fix": "qué se corrigió y por qué en español",
                      "codigo_corregido": "código JSX/JS completo del archivo corregido"
                    }

                    Si no puedes determinar un fix con certeza, devuelve codigo_corregido como cadena vacía.
                    """ : """
                    Eres un experto en Java/Spring Boot especializado en debugging y corrección de bugs en producción.
                    Cuando recibas un error de Sentry con el código fuente afectado, debes:
                    1. Analizar el error y su causa raíz
                    2. Proponer el código corregido completo del archivo (no solo el fragmento)
                    3. Explicar brevemente qué cambió y por qué

                    Responde SIEMPRE en este formato JSON exacto:
                    {
                      "analisis": "descripción del problema en español",
                      "causa_raiz": "causa raíz específica en español",
                      "descripcion_fix": "qué se corrigió y por qué en español",
                      "codigo_corregido": "código Java completo del archivo corregido"
                    }

                    Si no puedes determinar un fix con certeza, devuelve codigo_corregido como cadena vacía.
                    No hagas suposiciones riesgosas. Prioriza la seguridad sobre la completitud.
                    """;

            String userMessage = String.format("""
                    Error detectado en producción:

                    **Título:** %s
                    **Nivel:** %s
                    **Culprit:** %s

                    **Stack trace:**
                    %s

                    **Archivo afectado (%s):**
                    ```java
                    %s
                    ```

                    Analiza el error y proporciona el fix en el formato JSON solicitado.
                    """, titulo, nivel, culprit,
                    stackTrace != null ? stackTrace.substring(0, Math.min(stackTrace.length(), 2000)) : "No disponible",
                    filePath,
                    contenido.substring(0, Math.min(contenido.length(), 8000)));

            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", model,
                    "max_tokens", 8000,
                    "system", systemPrompt,
                    "messages", List.of(Map.of("role", "user", "content", userMessage))));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.anthropic.com/v1/messages"))
                    .timeout(Duration.ofSeconds(120))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", anthropicKey)
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("Claude API error: status={} body={}", response.statusCode(), response.body());
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            return root.path("content").get(0).path("text").asText();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Llamada a Claude interrumpida: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("Error llamando a Claude: {}", e.getMessage(), e);
            return null;
        }
    }
}
