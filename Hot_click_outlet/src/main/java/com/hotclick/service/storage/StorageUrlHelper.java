package com.hotclick.service.storage;

import java.util.Map;

/**
 * Extensiones, content-types y URL pública de S3.
 * Extraído bit-idéntico de SupabaseStorageService — no cambia comportamiento.
 */
public final class StorageUrlHelper {

    public static final Map<String, String> ALLOWED_EXTENSIONS = Map.of(
        "jpg",  "image/jpeg",
        "jpeg", "image/jpeg",
        "png",  "image/png",
        "webp", "image/webp",
        "gif",  "image/gif",
        "avif", "image/avif"
    );

    private StorageUrlHelper() {}

    public static String extensionDesdeContentType(String contentType) {
        if (contentType == null) return null;
        String base = contentType.toLowerCase().split(";")[0].trim();
        return switch (base) {
            case "image/jpeg" -> "jpg";
            case "image/png"  -> "png";
            case "image/webp" -> "webp";
            case "image/gif"  -> "gif";
            case "image/avif" -> "avif";
            default -> null;
        };
    }

    public static String obtenerExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase().trim();
        return ext.isEmpty() ? "" : ext;
    }

    public static String urlPublica(String publicUrl, String path) {
        return publicUrl + "/" + path;
    }
}
