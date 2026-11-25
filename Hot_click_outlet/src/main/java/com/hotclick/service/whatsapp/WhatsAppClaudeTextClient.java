package com.hotclick.service.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.ai.ClaudeUsoRegistrador;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Personaliza con Claude los mensajes del CRM enviados dentro de la ventana de 24 h
 * (reemplaza a gemini-1.5-flash). Los avisos de utilidad NO pasan por aquí: usan texto fijo o plantilla.
 * Si la llamada falla o no hay clave, devuelve el texto fijo de {@link WhatsAppHelpers#fallback}.
 */
@Component
class WhatsAppClaudeTextClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppClaudeTextClient.class);
    private static final String ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    /** Modelo configurable por WHATSAPP_IA_MODELO. */
    @Value("${whatsapp.ia.modelo:claude-haiku-5-5}")
    private String modelo;

    @Autowired(required = false)
    private ClaudeUsoRegistrador usoRegistrador;

    String generarTexto(WaPlantilla plantilla, Map<String, String> ctx, Long empresaId) {
        String prompt = plantilla.promptTemplate;
        for (Map.Entry<String, String> e : ctx.entrySet()) {
            prompt = prompt.replace("{{" + e.getKey() + "}}", e.getValue() != null ? e.getValue() : "");
        }
        try {
            String resultado = llamarClaude(prompt, empresaId);
            if (resultado != null && !resultado.isBlank()) return WhatsAppHelpers.limpiarTexto(resultado);
        } catch (Exception e) {
            log.warn("Claude no disponible para WA, usando fallback: {}", e.getClass().getSimpleName());
        }
        return WhatsAppHelpers.fallback(plantilla, ctx);
    }

    /** Llamada HTTP a la API de Anthropic; null si no hay clave. Visible para pruebas. */
    String llamarClaude(String prompt, Long empresaId) throws Exception {
        if (apiKey == null || apiKey.isBlank()) return null;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", modelo);
        body.put("max_tokens", 200);
        body.put("temperature", 0.85);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", ANTHROPIC_VERSION);

        ResponseEntity<String> resp = httpClient().postForEntity(
            ANTHROPIC_URL, new HttpEntity<>(JSON.writeValueAsString(body), headers), String.class);

        JsonNode root = JSON.readTree(resp.getBody());
        if (usoRegistrador != null) usoRegistrador.registrar(empresaId, root.path("usage"));
        JsonNode content = root.path("content");
        if (!content.isArray() || content.isEmpty()) return null;
        return content.get(0).path("text").asText("");
    }

    private static RestTemplate httpClient() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(10_000);
        return new RestTemplate(f);
    }
}
