package com.hotclick.service.catalogo;

import com.hotclick.service.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class CatalogoImageRelocationService {

    private static final Logger log = LoggerFactory.getLogger(CatalogoImageRelocationService.class);
    private static final long MAX_IMAGEN_DESCARGA_BYTES = 8L * 1024 * 1024;

    @Value("${aws.s3.public-url:}")
    private String s3PublicUrl;

    private final SupabaseStorageService storageService;
    private final RestTemplate rest;
    private final CatalogoImportValidator validator;

    public CatalogoImageRelocationService(SupabaseStorageService storageService,
                                          CatalogoImportValidator validator) {
        this.storageService = storageService;
        this.validator = validator;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
        this.rest = new RestTemplate(factory);
    }

    public String reubicarImagenEnS3(String urlOrigen) {
        if (urlOrigen == null || urlOrigen.isBlank()) {
            return null;
        }
        if (!s3PublicUrl.isBlank() && urlOrigen.startsWith(s3PublicUrl)) {
            return urlOrigen;
        }

        try {
            validator.validarUrl(urlOrigen);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; HotClickBot/1.0)");
            ResponseEntity<byte[]> resp = rest.exchange(
                urlOrigen, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);

            byte[] bytes = resp.getBody();
            if (bytes == null || bytes.length == 0 || bytes.length > MAX_IMAGEN_DESCARGA_BYTES) {
                return null;
            }

            String contentType = resp.getHeaders().getContentType() != null
                ? resp.getHeaders().getContentType().toString() : null;

            return storageService.subirImagenDescargada(bytes, urlOrigen, contentType, "productos/import");
        } catch (Exception e) {
            log.warn("[import] no se pudo reubicar imagen {} en S3: {}", urlOrigen, e.getMessage());
            return null;
        }
    }
}
