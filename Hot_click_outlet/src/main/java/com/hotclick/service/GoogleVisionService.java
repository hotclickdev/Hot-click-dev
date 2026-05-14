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
            Map<String, Object> feature = Map.of("type", "WEB_DETECTION", "maxResults", 10);
            Map<String, Object> request = Map.of("image", imageContent, "features", List.of(feature));
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
        Map<?, ?> web = (Map<?, ?>) resp.get("webDetection");
        if (web == null) return result;

        // Etiquetas del producto
        List<?> labels = (List<?>) web.get("bestGuessLabels");
        if (labels != null) {
            for (Object l : labels) {
                Map<?, ?> label = (Map<?, ?>) l;
                result.etiquetas.add((String) label.get("label"));
            }
        }

        // Páginas con imágenes similares (URLs de ecommerce)
        List<?> pages = (List<?>) web.get("pagesWithMatchingImages");
        if (pages != null) {
            for (Object p : pages) {
                Map<?, ?> page = (Map<?, ?>) p;
                String pageUrl = (String) page.get("url");
                if (pageUrl != null) result.urlsEcommerce.add(pageUrl);
                if (result.urlsEcommerce.size() >= 10) break;
            }
        }

        return result;
    }

    public static class VisionResult {
        public List<String> etiquetas = new ArrayList<>();
        public List<String> urlsEcommerce = new ArrayList<>();

        public boolean tieneResultados() {
            return !etiquetas.isEmpty() || !urlsEcommerce.isEmpty();
        }

        public String getEtiquetaPrincipal() {
            return etiquetas.isEmpty() ? null : etiquetas.get(0);
        }
    }
}
