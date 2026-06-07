package com.hotclick.controller;

import net.coobird.thumbnailator.Thumbnails;
import net.coobird.thumbnailator.geometry.Positions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@RestController
@RequestMapping("/api/img")
public class ImageProxyController {

    private static final Logger log = LoggerFactory.getLogger(ImageProxyController.class);
    private static final String ALLOWED_BUCKET = "HOT_CLICK/";
    private static final int MAX_DIM = 1200;

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-key}")
    private String serviceKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NORMAL)
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    /**
     * Proxies and optionally resizes images from Supabase Storage.
     *
     * @param p  path inside the HOT_CLICK bucket, e.g. "HOT_CLICK/productos/abc.jpg"
     * @param w  target width  in px (optional, max 1200)
     * @param h  target height in px (optional, max 1200)
     * @param q  JPEG quality 1–100 (default 82)
     */
    @GetMapping
    public ResponseEntity<byte[]> proxy(
            @RequestParam("p") String p,
            @RequestParam(value = "w", required = false) Integer w,
            @RequestParam(value = "h", required = false) Integer h,
            @RequestParam(value = "q", defaultValue = "82") int q) {

        if (p == null || p.contains("..") || !p.startsWith(ALLOWED_BUCKET)) {
            return ResponseEntity.badRequest().build();
        }

        // Clamp dimensions
        int width  = (w != null) ? Math.min(w, MAX_DIM) : 0;
        int height = (h != null) ? Math.min(h, MAX_DIM) : 0;
        int quality = Math.min(Math.max(q, 10), 100);

        String imageUrl = supabaseUrl + "/storage/v1/object/" + p;

        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(imageUrl))
                .header("Authorization", "Bearer " + serviceKey)
                .header("apikey", serviceKey)
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();

            HttpResponse<byte[]> response = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() != 200) {
                return ResponseEntity.status(response.statusCode()).build();
            }

            byte[] imageBytes = response.body();
            String contentType = response.headers().firstValue("content-type").orElse("image/jpeg");

            // Resize only when dimensions are requested and the source is a raster image
            if ((width > 0 || height > 0) && isResizable(contentType)) {
                imageBytes = resize(imageBytes, width, height, quality);
                contentType = "image/jpeg";
            }

            return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .header("Cache-Control", "public, max-age=31536000, immutable")
                .body(imageBytes);

        } catch (Exception e) {
            log.warn("[img-proxy] Error fetching {}: {}", p, e.getMessage());
            return ResponseEntity.status(502).build();
        }
    }

    private boolean isResizable(String contentType) {
        return contentType != null && (
            contentType.contains("jpeg") ||
            contentType.contains("jpg")  ||
            contentType.contains("png")  ||
            contentType.contains("webp") ||
            contentType.contains("gif")
        );
    }

    private byte[] resize(byte[] src, int width, int height, int quality) throws Exception {
        var builder = Thumbnails.of(new ByteArrayInputStream(src));

        if (width > 0 && height > 0) {
            builder.size(width, height).crop(Positions.CENTER);
        } else if (width > 0) {
            builder.width(width);
        } else {
            builder.height(height);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        builder.outputFormat("jpg")
               .outputQuality(quality / 100.0)
               .toOutputStream(out);
        return out.toByteArray();
    }
}
