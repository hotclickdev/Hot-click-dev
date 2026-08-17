package com.hotclick.service.storage;

import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

/**
 * Uploads a S3 (certificados privados e imágenes públicas).
 * Extraído bit-idéntico de SupabaseStorageService — no cambia comportamiento.
 */
public class StorageUploadHelper {

    private final S3Client s3Client;
    private final StorageImageValidator validator;

    public StorageUploadHelper(S3Client s3Client, StorageImageValidator validator) {
        this.s3Client = s3Client;
        this.validator = validator;
    }

    /**
     * Sube un certificado PKCS#12 al bucket privado de S3.
     * Path: certificados/{empresaId}/{uuid}.p12
     * Devuelve solo el path relativo (sin URL pública — el objeto es privado).
     */
    public String subirCertificado(MultipartFile file, Long empresaId, String bucket) throws IOException {
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

    public String subirImagen(MultipartFile file, String carpeta, String bucket, String publicUrl) throws IOException {
        byte[] bytes = validator.validarArchivo(file);
        String ext = StorageUrlHelper.obtenerExtension(file.getOriginalFilename());
        bytes = validator.sanitizarImagen(bytes, ext);
        String contentType = StorageUrlHelper.ALLOWED_EXTENSIONS.get(ext);
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

        return StorageUrlHelper.urlPublica(publicUrl, path);
    }

    /**
     * Sube una imagen descargada de una URL externa (ej. el CDN del sitio de origen en un
     * import de catálogo) — a diferencia de subirImagenBytes(), estos bytes SÍ pasan por la
     * validación completa (magic bytes + re-encode) porque vienen de una fuente no confiable,
     * igual que un upload de usuario. Reubicar la imagen en nuestro S3 evita depender de que
     * el sitio de origen la siga sirviendo y evita que el navegador la bloquee por CSP
     * (img-src solo permite una lista fija de dominios conocidos).
     */
    public String subirImagenDescargada(byte[] bytes, String urlOrigen, String contentTypeHint, String carpeta,
                                        String bucket, String publicUrl) throws IOException {
        if (bytes == null || bytes.length == 0) throw new IllegalArgumentException("La imagen está vacía");
        if (bytes.length > 10 * 1024 * 1024) throw new IllegalArgumentException("La imagen no puede superar 10 MB");

        String ext = StorageUrlHelper.obtenerExtension(urlOrigen);
        if (!StorageUrlHelper.ALLOWED_EXTENSIONS.containsKey(ext)) ext = StorageUrlHelper.extensionDesdeContentType(contentTypeHint);
        if (ext == null || !StorageUrlHelper.ALLOWED_EXTENSIONS.containsKey(ext))
            throw new IllegalArgumentException("No se pudo determinar el formato de la imagen");
        if (!validator.tienesMagicBytesValidos(ext, bytes))
            throw new IllegalArgumentException("El contenido del archivo no coincide con su extensión");

        bytes = validator.sanitizarImagen(bytes, ext);
        String contentType = StorageUrlHelper.ALLOWED_EXTENSIONS.get(ext);
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

        return StorageUrlHelper.urlPublica(publicUrl, path);
    }

    /**
     * Sube bytes de imagen generados internamente (ej. páginas de PDF rasterizadas) sin pasar
     * por MultipartFile. A diferencia de subirImagen(), no valida magic bytes ni re-encodea —
     * los bytes ya vienen de un encoder propio (ImageIO/Thumbnailator), no de un upload externo.
     */
    public String subirImagenBytes(byte[] bytes, String extension, String carpeta, String bucket, String publicUrl) {
        String contentType = StorageUrlHelper.ALLOWED_EXTENSIONS.get(extension);
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

        return StorageUrlHelper.urlPublica(publicUrl, path);
    }
}
