package com.hotclick.service.storage;

import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * Validación de magic bytes y re-encode de imágenes.
 * Extraído bit-idéntico de SupabaseStorageService — no cambia comportamiento.
 */
public class StorageImageValidator {

    private static final Logger log = LoggerFactory.getLogger(StorageImageValidator.class);

    /** FULL-01: tope de lado y de megapíxeles antes de decodificar (una bomba de 20000×20000 pide ~1.6 GB). */
    public static final int MAX_LADO_PX = 12_000;
    public static final long MAX_PIXELES = 40_000_000L;
    public static final String MSG_DEMASIADO_GRANDE =
        "La imagen es demasiado grande (máximo 40 megapíxeles y 12000 px por lado)";
    public static final String MSG_NO_PROCESABLE = "No se pudo procesar la imagen. Probá con otra foto en JPG o PNG.";

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
     * FULL-01: lee solo el header (ancho y alto) con {@link ImageReader}, sin decodificar los
     * píxeles, y rechaza imágenes por encima de {@link #MAX_LADO_PX} o {@link #MAX_PIXELES}.
     * Si ImageIO no tiene lector para el formato (WebP/AVIF sin plugin), tampoco lo decodifica
     * nadie en el backend, así que no hay nada que acotar.
     *
     * @throws IllegalArgumentException si la imagen supera el tope o el header no se puede leer.
     */
    public void verificarDimensiones(byte[] bytes) {
        try (ImageInputStream in = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) return;
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                long ancho = reader.getWidth(0);
                long alto = reader.getHeight(0);
                if (ancho <= 0 || alto <= 0) throw new IllegalArgumentException(MSG_NO_PROCESABLE);
                if (ancho > MAX_LADO_PX || alto > MAX_LADO_PX || ancho * alto > MAX_PIXELES) {
                    log.warn("[sanitize] imagen rechazada por tamaño {}x{}", ancho, alto);
                    throw new IllegalArgumentException(MSG_DEMASIADO_GRANDE);
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof IllegalArgumentException iae) throw iae;
            throw new IllegalArgumentException(MSG_NO_PROCESABLE, e);
        }
    }

    /**
     * Re-encodea la imagen para eliminar payloads embebidos (EXIF malicioso, PolyGlots,
     * scripts en comentarios). Solo aplica a JPEG y PNG — son los únicos formatos que
     * ImageIO soporta de forma confiable. GIF, WebP y AVIF se devuelven sin modificar;
     * la validación de magic bytes en validarArchivo() es suficiente para esos formatos.
     *
     * <p>Antes de decodificar se verifica el tamaño por header ({@link #verificarDimensiones}),
     * para todos los formatos, así una bomba GIF tampoco queda guardada para el proxy de
     * imágenes.
     *
     * <p>FULL-01: ya no hay fail-open. Si la imagen no se puede decodificar (incluido un
     * {@link OutOfMemoryError}), se rechaza con {@link IllegalArgumentException} (400) en vez
     * de subir el original.
     */
    public byte[] sanitizarImagen(byte[] bytes, String ext) {
        verificarDimensiones(bytes);
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
        } catch (OutOfMemoryError e) {
            log.warn("[sanitize] OutOfMemoryError al re-encodear imagen .{} — se rechaza", ext);
            throw new IllegalArgumentException(MSG_NO_PROCESABLE);
        } catch (Exception e) {
            log.warn("[sanitize] No se pudo re-encodear imagen .{}: {} — se rechaza", ext, e.getMessage());
            throw new IllegalArgumentException(MSG_NO_PROCESABLE, e);
        }
    }
}
