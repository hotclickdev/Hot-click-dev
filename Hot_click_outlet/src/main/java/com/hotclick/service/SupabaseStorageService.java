package com.hotclick.service;

import com.hotclick.exception.IntegracionExternaException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.public-url}")
    private String publicUrl;

    public SupabaseStorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    private static final Map<String, String> ALLOWED_EXTENSIONS = Map.of(
        "jpg",  "image/jpeg",
        "jpeg", "image/jpeg",
        "png",  "image/png",
        "webp", "image/webp",
        "gif",  "image/gif",
        "avif", "image/avif"
    );

    /**
     * Sube un certificado PKCS#12 al bucket privado de S3.
     * Path: certificados/{empresaId}/{uuid}.p12
     * Devuelve solo el path relativo (sin URL pública — el objeto es privado).
     */
    @CircuitBreaker(name = "s3", fallbackMethod = "subirCertificadoFallback")
    @Retry(name = "s3")
    public String subirCertificado(MultipartFile file, Long empresaId) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío");
        if (file.getSize() > 5 * 1024 * 1024) throw new IllegalArgumentException("El certificado no puede superar 5 MB");

        String fn = file.getOriginalFilename();
        String original = fn != null ? fn.toLowerCase() : "";
        if (!original.endsWith(".p12") && !original.endsWith(".pfx"))
            throw new IllegalArgumentException("Solo se permiten archivos .p12 o .pfx");

        byte[] bytes = file.getBytes();
        if (bytes.length < 2 || bytes[0] != 0x30)
            throw new IllegalArgumentException("El archivo no es un certificado PKCS#12 válido");

        String path = "certificados/" + empresaId + "/" + UUID.randomUUID() + ".p12";

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(path)
                        .contentType("application/x-pkcs12")
                        .build(),
                RequestBody.fromBytes(bytes)
        );

        return path;
    }

    public String subirImagen(MultipartFile file) throws IOException {
        return subirImagen(file, "productos");
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "subirImagenFallback")
    @Retry(name = "s3")
    public String subirImagen(MultipartFile file, String carpeta) throws IOException {
        byte[] bytes = validarArchivo(file);
        String ext = obtenerExtension(file.getOriginalFilename());
        bytes = sanitizarImagen(bytes, ext);
        String contentType = ALLOWED_EXTENSIONS.get(ext);
        String path = carpeta + "/" + UUID.randomUUID() + "." + ext;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(path)
                        .contentType(contentType)
                        .acl(ObjectCannedACL.PUBLIC_READ)
                        .build(),
                RequestBody.fromBytes(bytes)
        );

        return publicUrl + "/" + path;
    }

    /**
     * Sube bytes de imagen generados internamente (ej. páginas de PDF rasterizadas) sin pasar
     * por MultipartFile. A diferencia de subirImagen(), no valida magic bytes ni re-encodea —
     * los bytes ya vienen de un encoder propio (ImageIO/Thumbnailator), no de un upload externo.
     */
    @CircuitBreaker(name = "s3", fallbackMethod = "subirImagenBytesFallback")
    @Retry(name = "s3")
    public String subirImagenBytes(byte[] bytes, String extension, String carpeta) {
        String contentType = ALLOWED_EXTENSIONS.get(extension);
        if (contentType == null) throw new IllegalArgumentException("Formato no permitido: " + extension);

        String path = carpeta + "/" + UUID.randomUUID() + "." + extension;
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(path)
                        .contentType(contentType)
                        .acl(ObjectCannedACL.PUBLIC_READ)
                        .build(),
                RequestBody.fromBytes(bytes)
        );

        return publicUrl + "/" + path;
    }

    private String subirImagenBytesFallback(byte[] bytes, String extension, String carpeta, Throwable t) {
        log.error("[s3-circuit] OPEN subirImagenBytes carpeta={}: {}", carpeta, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    private byte[] validarArchivo(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío");
        if (file.getSize() > 10 * 1024 * 1024) throw new IllegalArgumentException("La imagen no puede superar 10 MB");

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
                (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF;
            case "png" ->
                (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
            case "gif" ->
                bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38;
            case "webp" ->
                bytes.length >= 12
                    && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                    && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50;
            default -> true;
        };
    }

    private String obtenerExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase().trim();
        return ext.isEmpty() ? "" : ext;
    }

    /**
     * Re-encodea la imagen para eliminar payloads embebidos (EXIF malicioso, PolyGlots,
     * scripts en comentarios). Solo aplica a JPEG y PNG — son los únicos formatos que
     * ImageIO soporta de forma confiable. GIF, WebP y AVIF se devuelven sin modificar;
     * la validación de magic bytes en validarArchivo() es suficiente para esos formatos.
     *
     * Fail-open: si Thumbnailator no puede procesar la imagen (edge case), devuelve los
     * bytes originales ya validados y registra un warning. Esto preserva disponibilidad
     * sin sacrificar la capa primaria de defensa (magic bytes + extension whitelist).
     */
    private byte[] sanitizarImagen(byte[] bytes, String ext) {
        if (!"jpg".equals(ext) && !"jpeg".equals(ext) && !"png".equals(ext)) {
            return bytes;
        }
        String formatName = "png".equals(ext) ? "png" : "jpeg";
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(bytes))
                .scale(1.0)
                .outputFormat(formatName)
                .toOutputStream(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.warn("[sanitize] No se pudo re-encodear imagen .{}: {} — se sube el original validado", ext, e.getMessage());
            return bytes;
        }
    }

    private String subirCertificadoFallback(MultipartFile file, Long empresaId, Throwable t) {
        log.error("[s3-circuit] OPEN subirCertificado empresa={}: {}", empresaId, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    private String subirImagenFallback(MultipartFile file, String carpeta, Throwable t) {
        log.error("[s3-circuit] OPEN subirImagen carpeta={}: {}", carpeta, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }
}
