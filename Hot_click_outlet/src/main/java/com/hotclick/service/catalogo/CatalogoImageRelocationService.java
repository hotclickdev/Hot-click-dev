package com.hotclick.service.catalogo;

import com.hotclick.service.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CatalogoImageRelocationService {

    private static final Logger log = LoggerFactory.getLogger(CatalogoImageRelocationService.class);
    private static final int MAX_IMAGEN_DESCARGA_BYTES = 8 * 1024 * 1024;

    @Value("${aws.s3.public-url:}")
    private String s3PublicUrl;

    private final SupabaseStorageService storageService;
    private final CatalogoImportValidator validator;

    public CatalogoImageRelocationService(SupabaseStorageService storageService,
                                          CatalogoImportValidator validator) {
        this.storageService = storageService;
        this.validator = validator;
    }

    public String reubicarImagenEnS3(String urlOrigen) {
        if (urlOrigen == null || urlOrigen.isBlank()) {
            return null;
        }
        if (!s3PublicUrl.isBlank() && urlOrigen.startsWith(s3PublicUrl)) {
            return urlOrigen;
        }

        try {
            UrlExternaSegura.Respuesta resp = UrlExternaSegura.descargar(
                urlOrigen, MAX_IMAGEN_DESCARGA_BYTES, 30_000, "Mozilla/5.0 (compatible; HotClickBot/1.0)");
            byte[] bytes = resp.cuerpo();
            if (bytes.length == 0) {
                return null;
            }

            String contentType = resp.contentType();

            return storageService.subirImagenDescargada(bytes, urlOrigen, contentType, "productos/import");
        } catch (Exception e) {
            log.warn("[import] no se pudo reubicar imagen {} en S3: {}", urlOrigen, e.getMessage());
            return null;
        }
    }
}
