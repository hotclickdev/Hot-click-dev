package com.hotclick.service;

import com.hotclick.dto.ProductoExtraidoDto;
import com.hotclick.service.catalogo.CatalogoClaudeClient;
import com.hotclick.service.catalogo.CatalogoImageRelocationService;
import com.hotclick.service.catalogo.CatalogoImportValidator;
import com.hotclick.service.catalogo.CatalogoPdfExtractor;
import com.hotclick.service.catalogo.CatalogoUrlExtractor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Extrae productos de URLs (scraping), PDFs y CSVs usando Claude como motor de comprensión.
 */
@Service
public class CatalogoImportService {

    private static final Logger log = LoggerFactory.getLogger(CatalogoImportService.class);

    @Autowired
    private CatalogoImportValidator validator;
    @Autowired
    private CatalogoUrlExtractor urlExtractor;
    @Autowired
    private CatalogoPdfExtractor pdfExtractor;
    @Autowired
    private CatalogoClaudeClient claudeClient;
    @Autowired
    private CatalogoImageRelocationService imageRelocationService;

    // ── URL ──────────────────────────────────────────────────────────────────

    public List<ProductoExtraidoDto> extraerDeUrl(String rawUrl) throws Exception {
        validator.validarUrl(rawUrl);
        return urlExtractor.extraerDeUrl(rawUrl);
    }

    // ── PDF ──────────────────────────────────────────────────────────────────

    public List<ProductoExtraidoDto> extraerDePdf(MultipartFile archivo) throws Exception {
        validator.validarPdf(archivo);
        return pdfExtractor.extraerDePdf(archivo);
    }

    // ── Imágenes de productos importados ────────────────────────────────────────

    /**
     * Descarga la imagen de producto desde el sitio de origen y la sube a nuestro S3.
     * Se llama al confirmar el import (no en la extracción/preview) para no gastar
     * ancho de banda ni storage en productos que el admin termina descartando.
     * Si falla por cualquier motivo, devuelve null en vez de tirar abajo el producto —
     * la URL externa igual quedaría bloqueada por CSP en el navegador, así que null
     * (sin imagen, editable a mano después) es mejor que dejar una URL rota.
     */
    public String reubicarImagenEnS3(String urlOrigen) {
        return imageRelocationService.reubicarImagenEnS3(urlOrigen);
    }

    // ── CSV ──────────────────────────────────────────────────────────────────

    public List<ProductoExtraidoDto> extraerDeCsv(MultipartFile archivo) throws Exception {
        validator.validarCsv(archivo);
        log.info("[import-csv] procesando {}", archivo.getOriginalFilename());
        String contenido = new String(archivo.getBytes(), detectarEncoding(archivo.getBytes()));
        return claudeClient.extraerConClaude(truncar(contenido), "archivo CSV");
    }

    private String detectarEncoding(byte[] bytes) {
        // Detectar BOM UTF-8
        if (bytes.length >= 3 && bytes[0] == (byte) 0xEF && bytes[1] == (byte) 0xBB && bytes[2] == (byte) 0xBF) {
            return "UTF-8";
        }
        return "UTF-8";
    }

    private String truncar(String texto) {
        if (texto == null) {
            return "";
        }
        int limite = 14_000;
        return texto.length() > limite ? texto.substring(0, limite) + "\n[... texto truncado ...]" : texto;
    }
}
