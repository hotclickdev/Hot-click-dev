package com.hotclick.service.whatsapp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
class WhatsAppGeminiTextClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppGeminiTextClient.class);

    @Value("${google.gemini.api-key:}")
    private String geminiKey;

    String generarTexto(WaPlantilla plantilla, Map<String, String> ctx) {
        String prompt = plantilla.promptTemplate;
        for (Map.Entry<String, String> e : ctx.entrySet()) {
            prompt = prompt.replace("{{" + e.getKey() + "}}", e.getValue() != null ? e.getValue() : "");
        }
        try {
            String resultado = llamarGeminiTexto(prompt);
            if (resultado != null && !resultado.isBlank()) return WhatsAppHelpers.limpiarTexto(resultado);
        } catch (Exception e) {
            log.warn("Gemini no disponible para WA, usando fallback: {}", e.getMessage());
        }
        return WhatsAppHelpers.fallback(plantilla, ctx);
    }

    private String llamarGeminiTexto(String prompt) {
        try {
            var parts = List.of(Map.of("text", prompt));
            Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", Map.of("temperature", 0.85, "maxOutputTokens", 120)
            );
            String apiKey = obtenerGeminiKey();
            if (apiKey == null || apiKey.isBlank()) return null;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

            ResponseEntity<Map> resp = httpClient().exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            Map<?, ?> respBody = resp.getBody();
            if (respBody == null) return null;
            @SuppressWarnings("unchecked")
            List<?> candidates = (List<?>) respBody.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;
            @SuppressWarnings("unchecked")
            Map<?, ?> content = (Map<?, ?>) ((Map<?, ?>) candidates.get(0)).get("content");
            @SuppressWarnings("unchecked")
            List<?> resParts = (List<?>) content.get("parts");
            return (String) ((Map<?, ?>) resParts.get(0)).get("text");
        } catch (Exception e) {
            log.debug("Gemini WA error: {}", e.getMessage());
            return null;
        }
    }

    private static RestTemplate httpClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory f =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(10_000);
        return new RestTemplate(f);
    }

    private String obtenerGeminiKey() {
        return geminiKey;
    }
}
