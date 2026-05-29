package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Llama a Gemini 1.5 Flash para analizar imágenes de producto y extraer
 * nombre, descripción, specs y cómo usar en español.
 * Usa la misma API key que Google Vision (${GOOGLE_VISION_API_KEY}).
 * Gemini free tier: 15 req/min, 1500 req/día.
 */
@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${google.gemini.api-key}")
    private String apiKey;

    public static class ProductoIA {
        public String nombre;
        public String marca;
        public String descripcionCorta;
        public String especificaciones;
        public String comoUsar;
    }

    /**
     * Analiza una o varias imágenes en base64 y devuelve datos del producto.
     * Devuelve null si Gemini no puede identificar el producto o falla la llamada.
     */
    public ProductoIA analizarProducto(List<String> imagenesBase64) {
        if (imagenesBase64 == null || imagenesBase64.isEmpty()) return null;
        try {
            String prompt = """
                You are a product catalog assistant for HOTCLICK, an e-commerce store in Costa Rica.

                Look carefully at the product in these images. Identify EXACTLY what physical product is shown.

                IGNORE any text overlays, watermarks, QR codes, CAPTCHA text, or website UI elements in the image.
                FOCUS ONLY on the physical product itself.

                Return ONLY a valid JSON object with these keys (no markdown, no extra text):
                {
                  "nombre": "full product name with brand and model (e.g. Kidde Carbon Monoxide Detector KN-COPP-3)",
                  "marca": "brand name only (e.g. Kidde)",
                  "descripcionCorta": "product description in Spanish, 1-2 sentences about what it does and key features, max 180 chars",
                  "especificaciones": "technical specs in Spanish as Clave: Valor lines. Include: type, coverage area, power source, detection range, battery life, dimensions, certifications. Max 450 chars.",
                  "comoUsar": "specific usage instructions in Spanish for THIS type of product, max 140 chars"
                }

                Rules:
                - "nombre" must identify the EXACT product (brand + model/type), not website text or UI elements
                - "especificaciones" must list REAL technical specs typical for this product category, not prices
                - "comoUsar" must be specific to this product type, not a generic phrase
                - If a field cannot be determined from the image, still provide reasonable typical values for this product type
                - Return ONLY the JSON object
                """;

            // Construir partes: primero el texto del prompt, luego las imágenes
            var parts = new java.util.ArrayList<>();
            parts.add(Map.of("text", prompt));
            for (String b64 : imagenesBase64) {
                parts.add(Map.of("inline_data", Map.of(
                    "mime_type", "image/jpeg",
                    "data", b64
                )));
            }

            Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", Map.of(
                    "temperature", 0.2,
                    "maxOutputTokens", 600
                )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String url = String.format(GEMINI_URL, apiKey);

            ResponseEntity<Map> resp = new RestTemplate().exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            return parsearRespuesta(resp.getBody());
        } catch (Exception e) {
            log.warn("Gemini no disponible: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private ProductoIA parsearRespuesta(Map<?, ?> body) {
        try {
            if (body == null) return null;
            List<?> candidates = (List<?>) body.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;
            Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
            Map<?, ?> content = (Map<?, ?>) candidate.get("content");
            if (content == null) return null;
            List<?> parts = (List<?>) content.get("parts");
            if (parts == null || parts.isEmpty()) return null;
            Map<?, ?> part = (Map<?, ?>) parts.get(0);
            String text = (String) part.get("text");
            if (text == null || text.isBlank()) return null;

            // Limpiar markdown si Gemini lo agrega de todas formas
            text = text.strip();
            if (text.startsWith("```")) {
                text = text.replaceAll("(?s)^```[a-z]*\\n?", "").replaceAll("```$", "").strip();
            }

            JsonNode node = JSON.readTree(text);
            ProductoIA p = new ProductoIA();
            p.nombre          = textoONull(node, "nombre");
            p.marca           = textoONull(node, "marca");
            p.descripcionCorta = textoONull(node, "descripcionCorta");
            p.especificaciones = textoONull(node, "especificaciones");
            p.comoUsar        = textoONull(node, "comoUsar");

            // Solo devolver si al menos un campo tiene datos
            if (p.nombre == null && p.descripcionCorta == null && p.especificaciones == null)
                return null;
            return p;
        } catch (Exception e) {
            log.debug("No se pudo parsear respuesta de Gemini: {}", e.getMessage());
            return null;
        }
    }

    private String textoONull(JsonNode node, String key) {
        JsonNode n = node.path(key);
        if (n.isNull() || n.isMissingNode()) return null;
        String v = n.asText("").trim();
        return v.isBlank() || v.equals("null") ? null : v;
    }
}
