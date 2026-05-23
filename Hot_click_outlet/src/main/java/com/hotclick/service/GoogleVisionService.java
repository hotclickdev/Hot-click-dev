package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.*;
import java.io.IOException;
import java.net.*;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.*;

@Service
public class GoogleVisionService {

    private static final Logger log = LoggerFactory.getLogger(GoogleVisionService.class);
    private static final String VISION_URL =
        "https://vision.googleapis.com/v1/images:annotate?key=%s";

    @Value("${google.vision.api-key}")
    private String apiKey;

    public VisionResult analizar(String imagenBase64) {
        try {
            RestTemplate rt = buildRestTemplate();
            String url = String.format(VISION_URL, apiKey);

            Map<String, Object> imageContent = Map.of("content", imagenBase64);
            List<Map<String, Object>> features = List.of(
                Map.of("type", "WEB_DETECTION",    "maxResults", 15),
                Map.of("type", "LABEL_DETECTION",  "maxResults", 10)
            );
            Map<String, Object> request = Map.of("image", imageContent, "features", features);
            Map<String, Object> body = Map.of("requests", List.of(request));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = rt.exchange(url, HttpMethod.POST, entity, Map.class);
            return parseResponse(response.getBody());
        } catch (Exception e) {
            log.error("Error Google Vision API: {}", e.getMessage());
            throw new RuntimeException("Error al analizar imagen con Vision API: " + e.getMessage());
        }
    }

    private RestTemplate buildRestTemplate() {
        try {
            TrustManager[] trustAll = new TrustManager[]{
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                    public void checkClientTrusted(X509Certificate[] c, String a) {}
                    public void checkServerTrusted(X509Certificate[] c, String a) {}
                }
            };
            SSLContext ctx = SSLContext.getInstance("TLS");
            ctx.init(null, trustAll, new SecureRandom());
            SSLSocketFactory sf = ctx.getSocketFactory();
            return new RestTemplate(new SimpleClientHttpRequestFactory() {
                @Override
                protected HttpURLConnection openConnection(URL url, Proxy proxy) throws IOException {
                    HttpURLConnection conn = super.openConnection(url, proxy);
                    if (conn instanceof HttpsURLConnection hc) {
                        hc.setSSLSocketFactory(sf);
                        hc.setHostnameVerifier((h, s) -> true);
                    }
                    return conn;
                }
            });
        } catch (Exception e) {
            log.warn("SSL trust-all falló, usando RestTemplate estándar: {}", e.getMessage());
            return new RestTemplate();
        }
    }

    @SuppressWarnings("unchecked")
    private VisionResult parseResponse(Map<?, ?> body) {
        VisionResult result = new VisionResult();
        if (body == null) return result;

        List<?> responses = (List<?>) body.get("responses");
        if (responses == null || responses.isEmpty()) return result;

        Map<?, ?> resp = (Map<?, ?>) responses.get(0);
        Map<?, ?> web  = (Map<?, ?>) resp.get("webDetection");

        if (web != null) {
            // webEntities: las más precisas para nombre del producto (tienen score)
            List<?> entities = (List<?>) web.get("webEntities");
            if (entities != null) {
                for (Object e : entities) {
                    Map<?, ?> ent = (Map<?, ?>) e;
                    String desc  = (String) ent.get("description");
                    Object scoreObj = ent.get("score");
                    if (desc == null || desc.isBlank()) continue;
                    double score = scoreObj instanceof Number n ? n.doubleValue() : 0;
                    // Descartar: puntaje bajo, texto muy corto, preguntas, marcas de agua genéricas
                    if (score < 0.4) continue;
                    if (desc.length() < 3) continue;
                    if (desc.endsWith("?") || desc.endsWith("!")) continue;
                    if (desc.equalsIgnoreCase("product") || desc.equalsIgnoreCase("image")) continue;
                    result.webEntities.add(new WebEntity(desc, score));
                }
                // Ordenar por score descendente
                result.webEntities.sort((a, b) -> Double.compare(b.score, a.score));
            }

            // bestGuessLabels solo como fallback si no hay webEntities útiles
            if (result.webEntities.isEmpty()) {
                List<?> labels = (List<?>) web.get("bestGuessLabels");
                if (labels != null) {
                    for (Object l : labels) {
                        Map<?, ?> label = (Map<?, ?>) l;
                        String lbl = (String) label.get("label");
                        if (lbl != null && !lbl.endsWith("?") && !lbl.endsWith("!"))
                            result.etiquetas.add(lbl);
                    }
                }
            } else {
                result.webEntities.forEach(we -> result.etiquetas.add(we.description));
            }

            // pagesWithMatchingImages: son páginas de producto directas (mejor que búsquedas)
            List<?> pages = (List<?>) web.get("pagesWithMatchingImages");
            if (pages != null) {
                for (Object p : pages) {
                    Map<?, ?> page = (Map<?, ?>) p;
                    String pageUrl = (String) page.get("url");
                    if (pageUrl != null) result.urlsEcommerce.add(pageUrl);
                    if (result.urlsEcommerce.size() >= 15) break;
                }
            }
        }

        // LABEL_DETECTION: categorías físicas del objeto (zapato, reloj, electrónico...)
        List<?> labelAnnotations = (List<?>) resp.get("labelAnnotations");
        if (labelAnnotations != null) {
            for (Object la : labelAnnotations) {
                Map<?, ?> ann = (Map<?, ?>) la;
                String desc = (String) ann.get("description");
                Object confObj = ann.get("score");
                double conf = confObj instanceof Number n ? n.doubleValue() : 0;
                if (desc != null && conf >= 0.7 && !result.etiquetas.contains(desc))
                    result.labelsFisicos.add(desc);
            }
        }

        return result;
    }

    public static class WebEntity {
        public String description;
        public double score;
        WebEntity(String d, double s) { description = d; score = s; }
    }

    public static class VisionResult {
        public List<String> etiquetas    = new ArrayList<>();
        public List<String> urlsEcommerce = new ArrayList<>();
        public List<WebEntity> webEntities = new ArrayList<>();
        public List<String> labelsFisicos  = new ArrayList<>();

        public boolean tieneResultados() {
            return !etiquetas.isEmpty() || !urlsEcommerce.isEmpty();
        }

        /** Nombre más preciso disponible: mejor webEntity con score alto. */
        public String getEtiquetaPrincipal() {
            if (!webEntities.isEmpty()) return webEntities.get(0).description;
            return etiquetas.isEmpty() ? null : etiquetas.get(0);
        }

        /** Etiqueta física más probable (categoría del objeto). */
        public String getCategoriaFisica() {
            return labelsFisicos.isEmpty() ? null : labelsFisicos.get(0);
        }
    }
}
