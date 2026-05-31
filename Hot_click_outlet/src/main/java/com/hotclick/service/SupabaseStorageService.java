package com.hotclick.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-key}")
    private String serviceKey;

    private static final String BUCKET = "HOT_CLICK";

    // Strict allowlist: extension → canonical MIME type
    private static final Map<String, String> ALLOWED_EXTENSIONS = Map.of(
        "jpg",  "image/jpeg",
        "jpeg", "image/jpeg",
        "png",  "image/png",
        "webp", "image/webp",
        "gif",  "image/gif",
        "avif", "image/avif"
    );

    // HttpClient with system default SSL — never skip certificate validation
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public String subirImagen(MultipartFile file) throws IOException, InterruptedException {
        return subirImagen(file, "productos");
    }

    public String subirImagen(MultipartFile file, String carpeta) throws IOException, InterruptedException {
        byte[] bytes = validarArchivo(file);
        String ext = obtenerExtension(file.getOriginalFilename());
        String contentType = ALLOWED_EXTENSIONS.get(ext);
        String path = carpeta + "/" + UUID.randomUUID() + "." + ext;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/storage/v1/object/" + BUCKET + "/" + path))
                .header("Authorization", "Bearer " + serviceKey)
                .header("apikey", serviceKey)
                .header("Content-Type", contentType)
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Supabase Storage error " + response.statusCode());
        }

        return supabaseUrl + "/storage/v1/object/public/" + BUCKET + "/" + path;
    }

    /** Validates the file and returns its bytes. Throws IllegalArgumentException on any violation. */
    private byte[] validarArchivo(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío");
        if (file.getSize() > 10 * 1024 * 1024) throw new IllegalArgumentException("La imagen no puede superar 10 MB");

        // Reject clearly non-image MIME types. application/octet-stream is allowed
        // because iOS Safari and some mobile browsers report it for all files;
        // the actual content is validated below via magic bytes.
        String ct = file.getContentType();
        if (ct != null && !ct.isBlank()
                && !ct.startsWith("image/")
                && !ct.equals("application/octet-stream")) {
            throw new IllegalArgumentException("Solo se permiten imágenes (JPG, PNG, WebP, GIF, AVIF)");
        }

        String ext = obtenerExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.containsKey(ext))
            throw new IllegalArgumentException("Formato no permitido. Usá JPG, PNG, WebP, GIF o AVIF");

        byte[] bytes = file.getBytes();
        if (!tienesMagicBytesValidos(ext, bytes))
            throw new IllegalArgumentException("El contenido del archivo no coincide con su extensión");

        return bytes;
    }

    private boolean tienesMagicBytesValidos(String ext, byte[] bytes) {
        if (bytes.length < 4) return false;
        return switch (ext) {
            case "jpg", "jpeg" ->
                // FF D8 FF
                (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF;
            case "png" ->
                // 89 50 4E 47
                (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
            case "gif" ->
                // GIF8
                bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38;
            case "webp" ->
                // RIFF (bytes 0-3) + WEBP (bytes 8-11) — must be at least 12 bytes
                bytes.length >= 12
                    && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                    && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50;
            // AVIF is an ISO Base Media File Format container — no reliable short magic; trust ext + MIME
            default -> true;
        };
    }

    private String obtenerExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase().trim();
        // Reject empty extensions (e.g. filename ending with a dot)
        return ext.isEmpty() ? "" : ext;
    }
}
