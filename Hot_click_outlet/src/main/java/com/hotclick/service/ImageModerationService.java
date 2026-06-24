package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Moderación de contenido usando Google Vision SafeSearch.
 * Rechaza imágenes con contenido adulto, violento o racialmente inapropiado.
 * Fail-open: si la API no responde, permite la imagen y registra warning.
 */
@Service
public class ImageModerationService {

    private static final Logger log = LoggerFactory.getLogger(ImageModerationService.class);
    private static final String VISION_URL =
        "https://vision.googleapis.com/v1/images:annotate?key=%s";

    // Likelihood values según Google Vision API
    private static final List<String> LIKELIHOOD_ORDER =
        List.of("UNKNOWN", "VERY_UNLIKELY", "UNLIKELY", "POSSIBLE", "LIKELY", "VERY_LIKELY");

    @Value("${google.vision.api-key:}")
    private String apiKey;

    public record ModerationResult(boolean safe, String reason) {}

    /**
     * Verifica si el archivo de imagen es seguro para publicar.
     * Fail-open: devuelve safe=true si la API falla.
     */
    public ModerationResult moderar(MultipartFile file) {
        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            return moderarBase64(base64);
        } catch (IOException e) {
            log.warn("[Moderación] No se pudo leer archivo: {}", e.getMessage());
            return new ModerationResult(true, null);
        }
    }

    private ModerationResult moderarBase64(String base64) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("[Moderación] google.vision.api-key no configurada — imagen aprobada (fail-open)");
            return new ModerationResult(true, null);
        }
        try {
            RestTemplate rt = buildRestTemplate();
            String url = String.format(VISION_URL, apiKey);

            Map<String, Object> body = Map.of("requests", List.of(
                Map.of(
                    "image",    Map.of("content", base64),
                    "features", List.of(Map.of("type", "SAFE_SEARCH_DETECTION"))
                )
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> response = rt.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            return parseSafeSearch(response.getBody());
        } catch (Exception e) {
            log.warn("[Moderación] Error API Vision (fail-open): {}", e.getMessage());
            return new ModerationResult(true, null);
        }
    }

    @SuppressWarnings("unchecked")
    private ModerationResult parseSafeSearch(Map<?, ?> body) {
        if (body == null) return new ModerationResult(true, null);

        List<?> responses = (List<?>) body.get("responses");
        if (responses == null || responses.isEmpty()) return new ModerationResult(true, null);

        Map<?, ?> resp = (Map<?, ?>) responses.get(0);
        Map<?, ?> ss   = (Map<?, ?>) resp.get("safeSearchAnnotation");
        if (ss == null) return new ModerationResult(true, null);

        String adult    = (String) ss.get("adult");
        String violence = (String) ss.get("violence");
        String racy     = (String) ss.get("racy");

        // adult >= LIKELY → rechazar (POSSIBLE rechaza productos con formas ambiguas)
        if (likelihood(adult) >= likelihood("LIKELY"))
            return new ModerationResult(false, "Contenido adulto detectado");
        // violence >= LIKELY → rechazar
        if (likelihood(violence) >= likelihood("LIKELY"))
            return new ModerationResult(false, "Contenido violento detectado");
        // racy >= VERY_LIKELY → rechazar
        if (likelihood(racy) >= likelihood("VERY_LIKELY"))
            return new ModerationResult(false, "Contenido inapropiado detectado");

        return new ModerationResult(true, null);
    }

    private int likelihood(String value) {
        if (value == null) return 0;
        int idx = LIKELIHOOD_ORDER.indexOf(value);
        return idx < 0 ? 0 : idx;
    }

    private RestTemplate buildRestTemplate() {
        return new RestTemplate();
    }
}
