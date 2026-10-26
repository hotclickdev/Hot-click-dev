package com.hotclick.controller;

import com.hotclick.exception.ImagenOcupadaException;
import com.hotclick.service.storage.StorageImageValidator;
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
    private static final StorageImageValidator IMAGE_VALIDATOR = new StorageImageValidator();
    private static final int MAX_DIM = 1200;

    @Value("${aws.s3.public-url}")
    private String s3PublicUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NEVER)
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    /**
     * Proxies and optionally resizes images from S3.
     *
     * @param p  relative path inside the S3 bucket, e.g. "productos/abc.jpg"
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
        return conCabecerasSeguras(proxyInterno(p, w, h, q));
    }

    static final String CSP_IMG = "default-src 'none'; sandbox";

    /** X-02: nosniff + CSP sandbox en TODAS las respuestas (200 y errores). */
    static ResponseEntity<byte[]> conCabecerasSeguras(ResponseEntity<byte[]> r) {
        org.springframework.http.HttpHeaders hs = new org.springframework.http.HttpHeaders();
        hs.putAll(r.getHeaders());
        hs.set("X-Content-Type-Options", "nosniff");
        hs.set("Content-Security-Policy", CSP_IMG);
        return new ResponseEntity<>(r.getBody(), hs, r.getStatusCode());
    }

    private ResponseEntity<byte[]> proxyInterno(String p, Integer w, Integer h, int q) {
        if (!ImageProxyPaths.esSeguro(p)) {
            return ResponseEntity.badRequest().build();
        }

        int width   = (w != null) ? Math.min(w, MAX_DIM) : 0;
        int height  = (h != null) ? Math.min(h, MAX_DIM) : 0;
        int quality = Math.min(Math.max(q, 10), 100);

        String cleanPath = p.startsWith("HOT_CLICK/") ? p.substring("HOT_CLICK/".length()) : p;
        if (!ImageProxyPaths.esSeguro(cleanPath)) {
            return ResponseEntity.badRequest().build();
        }
        String imageUrl  = s3PublicUrl + "/" + cleanPath;
        if (!ImageProxyPaths.hostPermitido(imageUrl, s3PublicUrl)) {
            return ResponseEntity.badRequest().build();
        }

        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(imageUrl))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();

            HttpResponse<byte[]> response = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() != 200) {
                return ResponseEntity.status(response.statusCode()).build();
            }

            byte[] imageBytes = response.body();
            String contentType = response.headers().firstValue("content-type").orElse("image/jpeg");

            if ((width > 0 || height > 0) && isResizable(tipoImagenPermitido(contentType))) {
                imageBytes = resize(imageBytes, width, height, quality);
                contentType = "image/jpeg";
            }

            // X-02: solo tipos de imagen raster se sirven inline; el resto (SVG, HTML, etc.)
            // va como descarga opaca. nosniff siempre.
            String permitido = tipoImagenPermitido(contentType);
            ResponseEntity.BodyBuilder ok = ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=31536000, immutable");
            if (permitido != null) {
                ok.header("Content-Type", permitido);
            } else {
                ok.header("Content-Type", "application/octet-stream")
                  .header("Content-Disposition", "attachment");
            }
            return ok.body(imageBytes);

        } catch (IllegalArgumentException e) {
            log.warn("[img-proxy] Imagen rechazada {}: {}", cleanPath, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (ImagenOcupadaException e) {
            return ResponseEntity.status(503)
                .header("Retry-After", String.valueOf(ImagenOcupadaException.RETRY_AFTER_SEGUNDOS))
                .build();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("[img-proxy] Interrumpido {}", cleanPath);
            return ResponseEntity.status(502).build();
        } catch (Exception e) {
            log.warn("[img-proxy] Error fetching {}: {}", cleanPath, e.getMessage());
            return ResponseEntity.status(502).build();
        }
    }

    static final java.util.Set<String> TIPOS_IMAGEN_PERMITIDOS =
        java.util.Set.of("image/png", "image/jpeg", "image/gif", "image/webp");

    /** Devuelve el media type normalizado si está en la allowlist (sin SVG), o null. */
    static String tipoImagenPermitido(String contentType) {
        if (contentType == null) return null;
        String base = contentType.split(";", 2)[0].trim().toLowerCase(java.util.Locale.ROOT);
        if ("image/jpg".equals(base)) base = "image/jpeg";
        return TIPOS_IMAGEN_PERMITIDOS.contains(base) ? base : null;
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
        // FULL-01: tope de megapíxeles por header antes de decodificar.
        IMAGE_VALIDATOR.verificarDimensiones(src);
        var builder = Thumbnails.of(new ByteArrayInputStream(src));

        if (width > 0 && height > 0) {
            builder.size(width, height).crop(Positions.CENTER);
        } else if (width > 0) {
            builder.width(width);
        } else {
            builder.height(height);
        }

        try {
            // R1: mismo tope global de decodificaciones simultáneas que los uploads.
            return StorageImageValidator.conPermisoDeDecodificacion(() -> {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                builder.outputFormat("jpg")
                       .outputQuality(quality / 100.0)
                       .toOutputStream(out);
                return out.toByteArray();
            });
        } catch (OutOfMemoryError e) {
            throw new IllegalArgumentException(StorageImageValidator.MSG_NO_PROCESABLE);
        }
    }
}
