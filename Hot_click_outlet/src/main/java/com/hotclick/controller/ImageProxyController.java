package com.hotclick.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-key}")
    private String serviceKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NORMAL)
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    @GetMapping
    public ResponseEntity<byte[]> proxy(@RequestParam("p") String p) {
        // Security: only allow HOT_CLICK bucket, reject path traversal
        if (p == null || p.contains("..") || !p.startsWith(ALLOWED_BUCKET)) {
            return ResponseEntity.badRequest().build();
        }

        // Use the authenticated path so the service key bypasses any bucket-level
        // public/private policy. /object/public/ relies on the bucket being public;
        // /object/ + service key works regardless of bucket visibility.
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

            String contentType = response.headers().firstValue("content-type").orElse("image/jpeg");

            return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .header("Cache-Control", "public, max-age=31536000, immutable")
                .body(response.body());

        } catch (Exception e) {
            log.warn("[img-proxy] Error fetching {}: {}", p, e.getMessage());
            return ResponseEntity.status(502).build();
        }
    }
}
