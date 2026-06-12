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
 * Analiza imágenes de producto usando Claude (Anthropic) para extraer
 * nombre, descripción, specs y cómo usar en español.
 * Reemplaza la implementación anterior basada en Gemini.
 */
@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";
    private static final String CLAUDE_MODEL = "claude-haiku-4-5-20251001";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${anthropic.api-key:}")
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
     * Devuelve null si Claude no puede identificar el producto o falla la llamada.
     */
    public ProductoIA analizarProducto(List<String> imagenesBase64) {
        if (imagenesBase64 == null || imagenesBase64.isEmpty()) return null;
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[GeminiService] anthropic.api-key no configurada — análisis de imágenes deshabilitado");
            return null;
        }
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

            // Construir content de Claude: texto + imágenes
            var contentParts = new java.util.ArrayList<>();
            for (String b64 : imagenesBase64) {
                contentParts.add(Map.of(
                    "type", "image",
                    "source", Map.of(
                        "type",       "base64",
                        "media_type", "image/jpeg",
                        "data",       b64
                    )
                ));
            }
            contentParts.add(Map.of("type", "text", "text", prompt));

            Map<String, Object> body = Map.of(
                "model",      CLAUDE_MODEL,
                "max_tokens", 600,
                "messages",   List.of(Map.of("role", "user", "content", contentParts))
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key",         apiKey);
            headers.set("anthropic-version",  "2023-06-01");

            ResponseEntity<Map> resp = new RestTemplate().exchange(
                java.net.URI.create(CLAUDE_URL),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class);

            return parsearRespuesta(resp.getBody());
        } catch (Exception e) {
            log.warn("[GeminiService] Claude no disponible para análisis de imagen: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private ProductoIA parsearRespuesta(Map<?, ?> body) {
        try {
            if (body == null) return null;
            // Formato de respuesta Claude: {"content": [{"type":"text","text":"..."}], ...}
            List<?> content = (List<?>) body.get("content");
            if (content == null || content.isEmpty()) return null;
            Map<?, ?> firstBlock = (Map<?, ?>) content.get(0);
            String text = (String) firstBlock.get("text");
            if (text == null || text.isBlank()) return null;

            text = text.strip();
            if (text.startsWith("```")) {
                text = text.replaceAll("(?s)^```[a-z]*\\n?", "").replaceAll("```$", "").strip();
            }

            JsonNode node = JSON.readTree(text);
            ProductoIA p = new ProductoIA();
            p.nombre           = textoONull(node, "nombre");
            p.marca            = textoONull(node, "marca");
            p.descripcionCorta = textoONull(node, "descripcionCorta");
            p.especificaciones = textoONull(node, "especificaciones");
            p.comoUsar         = textoONull(node, "comoUsar");

            if (p.nombre == null && p.descripcionCorta == null && p.especificaciones == null)
                return null;
            return p;
        } catch (Exception e) {
            log.debug("[GeminiService] No se pudo parsear respuesta de Claude: {}", e.getMessage());
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
