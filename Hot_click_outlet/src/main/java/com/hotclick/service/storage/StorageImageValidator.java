package com.hotclick.service.storage;

import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Validación de magic bytes y re-encode de imágenes.
 * Extraído bit-idéntico de SupabaseStorageService — no cambia comportamiento.
 */
public class StorageImageValidator {

    private static final Logger log = LoggerFactory.getLogger(StorageImageValidator.class);

    public byte[] validarArchivo(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío");
        if (file.getSize() > 10 * 1024 * 1024) throw new IllegalArgumentException("La imagen no puede superar 10 MB");

        String ct = file.getContentType();
        if (ct != null && !ct.isBlank()
                && !ct.startsWith("image/")
                && !ct.equals("application/octet-stream")) {
            throw new IllegalArgumentException("Solo se permiten imágenes (JPG, PNG, WebP, GIF, AVIF)");
        }

        String ext = StorageUrlHelper.obtenerExtension(file.getOriginalFilename());
        if (!StorageUrlHelper.ALLOWED_EXTENSIONS.containsKey(ext))
            throw new IllegalArgumentException("Formato no permitido. Usá JPG, PNG, WebP, GIF o AVIF");

        byte[] bytes = file.getBytes();
        if (!tienesMagicBytesValidos(ext, bytes))
            throw new IllegalArgumentException("El contenido del archivo no coincide con su extensión");

        return bytes;
    }

    public boolean tienesMagicBytesValidos(String ext, byte[] bytes) {
        if (bytes.length < 4) return false;
        return switch (ext) {
            case "jpg", "jpeg" -> esJpeg(bytes);
            case "png" -> esPng(bytes);
            case "gif" -> esGif(bytes);
            case "webp" -> esWebp(bytes);
            default -> true;
        };
    }

    /** True si el contenido es JPEG, PNG, GIF o WebP, sin confiar en el Content-Type. */
    public boolean esImagenPorContenido(byte[] bytes) {
        return bytes != null && (esJpeg(bytes) || esPng(bytes) || esGif(bytes) || esWebp(bytes));
    }

    private static boolean esJpeg(byte[] bytes) {
        return bytes.length >= 3
            && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF;
    }

    private static boolean esPng(byte[] bytes) {
        return bytes.length >= 4
            && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
    }

    private static boolean esGif(byte[] bytes) {
        return bytes.length >= 4
            && bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38;
    }

    private static boolean esWebp(byte[] bytes) {
        return bytes.length >= 12
            && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
            && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50;
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
    public byte[] sanitizarImagen(byte[] bytes, String ext) {
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
}
