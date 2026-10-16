package com.hotclick.service.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

/**
 * PAG-9: comprobantes en un bucket privado. En la base se guarda una referencia
 * {@code s3-privado:<key>} (nunca una URL pública) y solo se entrega una URL firmada de pocos minutos.
 */
@Service
public class ComprobantePrivadoStorage {

    public static final String PREFIJO = "s3-privado:";

    private final com.hotclick.service.SupabaseStorageService storage;
    private final S3Presigner presigner;
    private final String bucketPrivado;
    private final long minutos;

    public ComprobantePrivadoStorage(com.hotclick.service.SupabaseStorageService storage, S3Presigner presigner,
                                     @Value("${aws.s3.private-bucket:}") String bucketPrivado,
                                     @Value("${aws.s3.signed-url-minutes:5}") long minutos) {
        this.storage = storage;
        this.presigner = presigner;
        this.bucketPrivado = bucketPrivado == null ? "" : bucketPrivado.trim();
        this.minutos = Math.max(1, Math.min(minutos, 15));
    }

    /** @return referencia {@code s3-privado:<key>} para guardar en la base. */
    public String subir(MultipartFile archivo, String carpeta) throws IOException {
        if (bucketPrivado.isEmpty()) {
            throw new IllegalStateException("Almacenamiento privado no configurado. No se guardó el comprobante.");
        }
        String nombre = archivo.getOriginalFilename() == null ? "" : archivo.getOriginalFilename();
        String ext = StorageUrlHelper.obtenerExtension(nombre);
        String key = carpeta + "/" + UUID.randomUUID() + "." + ext;
        return PREFIJO + storage.subirImagenPrivadaEn(archivo, key, bucketPrivado);
    }

    public static boolean esPrivado(String ref) {
        return ref != null && ref.startsWith(PREFIJO);
    }

    /**
     * URL firmada (GET, pocos minutos) para una referencia privada. Las URLs públicas viejas se
     * devuelven tal cual hasta que DevOps las migre (ver PR).
     */
    public String urlParaVer(String ref) {
        if (!esPrivado(ref) || bucketPrivado.isEmpty()) return ref;
        String key = ref.substring(PREFIJO.length());
        var get = GetObjectRequest.builder().bucket(bucketPrivado).key(key).build();
        var req = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(minutos)).getObjectRequest(get).build();
        return presigner.presignGetObject(req).url().toString();
    }
}
