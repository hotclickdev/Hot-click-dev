package com.hotclick.service.catalogo;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class CatalogoImportValidator {

    private static final Pattern ALLOWED_SCHEMES = Pattern.compile("^https?$", Pattern.CASE_INSENSITIVE);
    private static final Set<String> BLOCKED_HOSTS = Set.of(
        "localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "::1"
    );

    public void validarUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("Ingresá una URL válida.");
        }
        URI uri = URI.create(rawUrl.trim());
        if (!ALLOWED_SCHEMES.matcher(uri.getScheme() != null ? uri.getScheme() : "").matches()) {
            throw new IllegalArgumentException("Solo se permiten URLs http o https.");
        }
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        if (BLOCKED_HOSTS.contains(host) || host.startsWith("192.168.") || host.startsWith("10.")) {
            throw new IllegalArgumentException("URL no permitida.");
        }
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
