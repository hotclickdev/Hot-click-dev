package com.hotclick.service.aigeneration;

import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

/**
 * Validaciones de entrada para generación de fichas con IA.
 * Extraído bit-idéntico de AiGenerationService — no cambia comportamiento.
 */
public final class AiGenerationValidator {

    static final Set<String> ALLOWED_MEDIA_TYPES = Set.of(
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    private AiGenerationValidator() {}

    public static void validarApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("El servicio de IA no está habilitado en este entorno.");
        }
    }

    public static void validarImagen(MultipartFile imagen) {
        if (imagen == null || imagen.isEmpty()) {
            throw new IllegalArgumentException("Debés adjuntar una imagen del producto.");
        }
        if (imagen.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("La imagen no puede superar 10 MB.");
        }
        String ct = imagen.getContentType();
        if (ct == null || !ALLOWED_MEDIA_TYPES.contains(ct.toLowerCase())) {
            throw new IllegalArgumentException(
                "Formato de imagen no soportado. Usá JPG, PNG o WebP.");
        }
        try {
            byte[] header = imagen.getBytes();
            if (header.length < 4) throw new IllegalArgumentException("Archivo demasiado pequeño para ser una imagen válida.");
            boolean validHeader =
                ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8) || // JPEG
                ((header[0] & 0xFF) == 0x89 && header[1] == 0x50)           || // PNG
                (header[0] == 0x52 && header[1] == 0x49);                       // WebP/RIFF
            if (!validHeader) throw new IllegalArgumentException("El contenido del archivo no coincide con el formato declarado.");
        } catch (java.io.IOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo.");
        }
    }

    public static String normalizeMediaType(String contentType) {
        if (contentType == null) return "image/jpeg";
        // La API de Claude no acepta "image/jpg"; requiere "image/jpeg"
        return contentType.equalsIgnoreCase("image/jpg") ? "image/jpeg" : contentType.toLowerCase();
    }
}
