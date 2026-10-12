package com.hotclick.service.catalogo;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;


@Service
public class CatalogoImportValidator {

    /** P11-01: https, DNS resuelto y sin destinos internos (ver {@link UrlExternaSegura}). */
    public void validarUrl(String rawUrl) {
        UrlExternaSegura.validar(rawUrl);
    }

    public void validarPdf(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("Seleccioná un archivo PDF.");
        }
        if (archivo.getSize() > 30 * 1024 * 1024) {
            throw new IllegalArgumentException("El PDF no puede superar 30 MB.");
        }
        String ct = archivo.getContentType();
        if (ct == null || !ct.contains("pdf")) {
            throw new IllegalArgumentException("El archivo debe ser un PDF.");
        }
    }

    public void validarCsv(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("Seleccioná un archivo CSV.");
        }
        if (archivo.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("El CSV no puede superar 5 MB.");
        }
    }
}
