package com.hotclick.service;

import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.exception.ImagenOcupadaException;
import com.hotclick.service.storage.StorageImageValidator;
import com.hotclick.service.storage.StorageUploadHelper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;

import java.io.IOException;

/**
 * Fachada de almacenamiento S3. Delega upload y validación a {@link com.hotclick.service.storage}.
 */
@Service
public class SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    private final StorageUploadHelper uploadHelper;
    private final StorageImageValidator validator;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.public-url}")
    private String publicUrl;

    public SupabaseStorageService(S3Client s3Client) {
        this.validator = new StorageImageValidator();
        this.uploadHelper = new StorageUploadHelper(s3Client, this.validator);
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "subirCertificadoFallback")
    @Retry(name = "s3")
    public String subirCertificado(MultipartFile file, Long empresaId) throws IOException {
        return uploadHelper.subirCertificado(file, empresaId, bucket);
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "subirXmlPrivadoFallback")
    @Retry(name = "s3")
    public String subirXmlPrivado(byte[] xml, String key) {
        return uploadHelper.subirXmlPrivado(xml, key, bucket);
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "subirImagenPrivadaFallback")
    @Retry(name = "s3")
    public String subirImagenPrivada(MultipartFile file, String key) throws IOException {
        return uploadHelper.subirImagenPrivada(file, key, bucket);
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "leerPrivadoFallback")
    @Retry(name = "s3")
    public byte[] leerPrivado(String key) {
        return uploadHelper.leerPrivado(key, bucket);
    }

    public String subirImagen(MultipartFile file) throws IOException {
        return subirImagen(file, "productos");
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "subirImagenFallback")
    @Retry(name = "s3")
    public String subirImagen(MultipartFile file, String carpeta) throws IOException {
        return uploadHelper.subirImagen(file, carpeta, bucket, publicUrl);
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "subirImagenDescargadaFallback")
    @Retry(name = "s3")
    public String subirImagenDescargada(byte[] bytes, String urlOrigen, String contentTypeHint, String carpeta) throws IOException {
        return uploadHelper.subirImagenDescargada(bytes, urlOrigen, contentTypeHint, carpeta, bucket, publicUrl);
    }

    @CircuitBreaker(name = "s3", fallbackMethod = "subirImagenBytesFallback")
    @Retry(name = "s3")
    public String subirImagenBytes(byte[] bytes, String extension, String carpeta) {
        return uploadHelper.subirImagenBytes(bytes, extension, carpeta, bucket, publicUrl);
    }

    private byte[] validarArchivo(MultipartFile file) throws IOException {
        return validator.validarArchivo(file);
    }

    private String subirImagenDescargadaFallback(byte[] bytes, String urlOrigen, String contentTypeHint, String carpeta, Throwable t) {
        log.error("[s3-circuit] OPEN subirImagenDescargada carpeta={}: {}", carpeta, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    private String subirImagenBytesFallback(byte[] bytes, String extension, String carpeta, Throwable t) {
        log.error("[s3-circuit] OPEN subirImagenBytes carpeta={}: {}", carpeta, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    private String subirCertificadoFallback(MultipartFile file, Long empresaId, Throwable t) {
        log.error("[s3-circuit] OPEN subirCertificado empresa={}: {}", empresaId, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    private String subirXmlPrivadoFallback(byte[] xml, String key, Throwable t) {
        log.error("[s3-circuit] OPEN subirXmlPrivado key={}: {}", key, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    private String subirImagenPrivadaFallback(MultipartFile file, String key, Throwable t) {
        log.error("[s3-circuit] OPEN subirImagenPrivada: {}", t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    private byte[] leerPrivadoFallback(String key, Throwable t) {
        log.error("[s3-circuit] OPEN leerPrivado: {}", t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }

    /**
     * FULL-01: un rechazo de validación (tamaño, formato, imagen no decodificable) no es una
     * falla de S3. Resilience4j elige el fallback con el tipo de excepción más específico, así
     * que estos dos lo devuelven tal cual y el controller responde 400 en vez de "almacenamiento
     * no disponible". Retry y circuit breaker de s3 lo ignoran (application.properties).
     */
    private String subirImagenFallback(MultipartFile file, String carpeta, IllegalArgumentException e) {
        throw e;
    }

    /** R1: sin permiso de decodificación → 503, no "S3 caído". */
    private String subirImagenFallback(MultipartFile file, String carpeta, ImagenOcupadaException e) {
        throw e;
    }

    private String subirImagenDescargadaFallback(byte[] bytes, String urlOrigen, String contentTypeHint, String carpeta,
                                                 ImagenOcupadaException e) {
        throw e;
    }

    private String subirImagenDescargadaFallback(byte[] bytes, String urlOrigen, String contentTypeHint, String carpeta,
                                                 IllegalArgumentException e) {
        throw e;
    }

    private String subirImagenFallback(MultipartFile file, String carpeta, Throwable t) {
        log.error("[s3-circuit] OPEN subirImagen carpeta={}: {}", carpeta, t.getMessage());
        throw new IntegracionExternaException("s3", IntegracionExternaException.Tipo.IO_ERROR,
            "Servicio de almacenamiento no disponible temporalmente");
    }
}
