package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

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

    // F29: connectTimeout explicit — previously default (could hang indefinitely on Supabase timeouts)
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(java.time.Duration.ofSeconds(10))
        .build();

    /**
     * Sube un certificado PKCS#12 (.p12/.pfx) al bucket privado.
     * Path: certificados/{empresaId}/{uuid}.p12
     * NO devuelve URL pública — solo el path relativo para guardarlo en BD.
     */
    @CircuitBreaker(name = "supabase", fallbackMethod = "subirCertificadoFallback")
    @Retry(name = "supabase")
    public String subirCertificado(MultipartFile file, Long empresaId) throws IOException, InterruptedException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío");
        if (file.getSize() > 5 * 1024 * 1024) throw new IllegalArgumentException("El certificado no puede superar 5 MB");

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!original.endsWith(".p12") && !original.endsWith(".pfx"))
            throw new IllegalArgumentException("Solo se permiten archivos .p12 o .pfx");

        byte[] bytes = file.getBytes();
        // PKCS#12 magic bytes: 30 82 (DER encoding of a SEQUENCE)
        if (bytes.length < 2 || bytes[0] != 0x30)
            throw new IllegalArgumentException("El archivo no es un certificado PKCS#12 válido");

        String path = "certificados/" + empresaId + "/" + UUID.randomUUID() + ".p12";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/storage/v1/object/" + BUCKET + "/" + path))
                .header("Authorization", "Bearer " + serviceKey)
                .header("apikey", serviceKey)
                .header("Content-Type", "application/x-pkcs12")
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300)
            throw new RuntimeException("Supabase Storage error " + response.statusCode());

        return path; // solo el path, no URL pública
    }

    public String subirImagen(MultipartFile file) throws IOException, InterruptedException {
        return subirImagen(file, "productos");
    }

    @CircuitBreaker(name = "supabase", fallbackMethod = "subirImagenFallback")
    @Retry(name = "supabase")
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

    private String subirCertificadoFallback(MultipartFile file, Long empresaId, Throwable t) {
        log.error("[supabase-circuit] OPEN subirCertificado empresa={}: {}", empresaId, t.getMessage());
        throw new RuntimeException("Servicio de almacenamiento no disponible temporalmente");
    }

    private String subirImagenFallback(MultipartFile file, String carpeta, Throwable t) {
        log.error("[supabase-circuit] OPEN subirImagen carpeta={}: {}", carpeta, t.getMessage());
        throw new RuntimeException("Servicio de almacenamiento no disponible temporalmente");
    }
}
