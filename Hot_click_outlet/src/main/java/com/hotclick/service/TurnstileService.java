package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Valida tokens Cloudflare Turnstile contra la API de siteverify.
 * Si la clave secreta no está configurada, todas las peticiones pasan (modo dev).
 * Si la API falla, la petición pasa igualmente (fail-open) para no bloquear a usuarios legítimos.
 */
@Service
public class TurnstileService {

    private static final Logger log = LoggerFactory.getLogger(TurnstileService.class);
    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${turnstile.secret.key:}")
    private String secretKey;

    private final ObjectMapper objectMapper;

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    public TurnstileService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Verifica el token Turnstile del cliente.
     *
     * @param token El token recibido del frontend (campo cf-turnstile-response / turnstileToken).
     * @param ip    IP del cliente (opcional, mejora la precisión).
     * @return true si el token es válido o si Turnstile no está configurado (dev).
     */
    public boolean verify(String token, String ip) {
        if (secretKey == null || secretKey.isBlank()) return true;
        if (token == null || token.isBlank()) {
            log.warn("[TURNSTILE] Token vacío en solicitud");
            return false;
        }

        try {
            StringBuilder body = new StringBuilder();
            body.append("secret=").append(URLEncoder.encode(secretKey, StandardCharsets.UTF_8));
            body.append("&response=").append(URLEncoder.encode(token, StandardCharsets.UTF_8));
            if (ip != null && !ip.isBlank()) {
                body.append("&remoteip=").append(URLEncoder.encode(ip, StandardCharsets.UTF_8));
            }

            HttpResponse<String> resp = http.send(
                HttpRequest.newBuilder()
                    .uri(URI.create(VERIFY_URL))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                    .timeout(Duration.ofSeconds(8))
                    .build(),
                HttpResponse.BodyHandlers.ofString()
            );

            if (resp.statusCode() != 200) {
                log.warn("[TURNSTILE] HTTP {} de Cloudflare — fail-open", resp.statusCode());
                return true;
            }

            JsonNode node = objectMapper.readTree(resp.body());
            boolean success = node.path("success").asBoolean(false);

            if (!success) {
                log.warn("[TURNSTILE] Token rechazado — error-codes: {}", node.path("error-codes"));
            }

            return success;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return true;
        } catch (Exception e) {
            log.error("[TURNSTILE] Error al verificar token: {} — fail-open", e.getMessage());
            return true;
        }
    }
}
