package com.hotclick.service.catalogo;

import com.hotclick.dto.ProductoExtraidoDto;
import com.hotclick.service.SupabaseStorageService;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class CatalogoPdfExtractor {

    private static final Logger log = LoggerFactory.getLogger(CatalogoPdfExtractor.class);

    private static final int MAX_PRODUCTOS = 100;
    private static final int MAX_PAGINAS_VISION = 45;
    private static final int PAGINAS_POR_LOTE_VISION = 6;
    private static final int DPI_RENDER_VISION = 100;
    private static final int MAX_TEXT_CHARS = 14_000;

    private final CatalogoClaudeClient claudeClient;
    private final SupabaseStorageService storageService;

    public CatalogoPdfExtractor(CatalogoClaudeClient claudeClient, SupabaseStorageService storageService) {
        this.claudeClient = claudeClient;
        this.storageService = storageService;
    }

    public List<ProductoExtraidoDto> extraerDePdf(MultipartFile archivo) throws Exception {
        log.info("[import-pdf] procesando {}", archivo.getOriginalFilename());

        String texto;
        int numPaginas;
        byte[] pdfBytes = archivo.getBytes();
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            numPaginas = pdf.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            texto = stripper.getText(pdf).trim();
        }

        log.info("[import-pdf] {} páginas, {} chars de texto extraído. Preview: {}",
            numPaginas, texto.length(),
            texto.substring(0, Math.min(200, texto.length())).replace("\n", " "));

        if (!texto.isBlank()) {
            return claudeClient.extraerConClaude(truncar(texto), "catálogo PDF");
        }

        log.info("[import-pdf] sin texto extraíble, se reintenta con visión (páginas rasterizadas)");
        return extraerDePdfEscaneado(pdfBytes, numPaginas);
    }

    private List<ProductoExtraidoDto> extraerDePdfEscaneado(byte[] pdfBytes, int numPaginas) throws Exception {
        int paginasAProcesar = Math.min(numPaginas, MAX_PAGINAS_VISION);
        if (numPaginas > MAX_PAGINAS_VISION) {
            log.warn("[import-pdf] PDF de {} páginas supera el máximo de {} páginas para visión — se procesan solo las primeras",
                numPaginas, MAX_PAGINAS_VISION);
        }

        List<ProductoExtraidoDto> resultado = new ArrayList<>();
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(pdf);

            for (int inicio = 0; inicio < paginasAProcesar && resultado.size() < MAX_PRODUCTOS; inicio += PAGINAS_POR_LOTE_VISION) {
                int fin = Math.min(inicio + PAGINAS_POR_LOTE_VISION, paginasAProcesar);
                List<Map<String, Object>> contenido = new ArrayList<>();

                for (int i = inicio; i < fin; i++) {
                    byte[] jpg;
                    try {
                        BufferedImage img = renderer.renderImageWithDPI(i, DPI_RENDER_VISION);
                        jpg = aJpegBytes(img);
                    } catch (Exception e) {
                        log.warn("[import-pdf] no se pudo renderizar página {}: {}", i + 1, e.getMessage());
                        continue;
                    }

                    String urlReferencia = null;
                    try {
                        urlReferencia = storageService.subirImagenBytes(jpg, "jpg", "productos/pdf-import");
                    } catch (Exception e) {
                        log.warn("[import-pdf] no se pudo subir imagen de la página {} a S3: {}", i + 1, e.getMessage());
                    }

                    contenido.add(Map.of("type", "text", "text",
                        "Página " + (i + 1) + " del catálogo" +
                            (urlReferencia != null ? " (imagen de referencia: " + urlReferencia + ")" : "") + ":"));
                    contenido.add(Map.of("type", "image", "source", Map.of(
                        "type", "base64",
                        "media_type", "image/jpeg",
                        "data", Base64.getEncoder().encodeToString(jpg))));
                }

                if (contenido.isEmpty()) {
                    continue;
                }

                contenido.add(Map.of("type", "text", "text",
                    "Para cada producto que encuentres, usá como imagenPrincipalUrl la 'imagen de referencia' " +
                        "de la página en la que aparece (te la di arriba de cada imagen) — es la foto de la página " +
                        "completa, no un recorte del producto individual. Si una página no tiene imagen de referencia, poné null."));

                try {
                    List<ProductoExtraidoDto> productosLote = claudeClient.extraerConClaudeVision(contenido);
                    resultado.addAll(productosLote);
                    log.info("[import-pdf] páginas {}-{}: {} productos", inicio + 1, fin, productosLote.size());
                } catch (Exception e) {
                    log.warn("[import-pdf] falló la extracción del lote de páginas {}-{}: {}", inicio + 1, fin, e.getMessage());
                }
            }
        }

        if (resultado.isEmpty()) {
            throw new IllegalArgumentException(
                "No se pudieron extraer productos de este PDF escaneado. Probá con el modo URL o CSV.");
        }

        return resultado.size() > MAX_PRODUCTOS ? resultado.subList(0, MAX_PRODUCTOS) : resultado;
    }

    private byte[] aJpegBytes(BufferedImage img) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Thumbnails.of(img).scale(1.0).outputQuality(0.85).outputFormat("jpg").toOutputStream(out);
        return out.toByteArray();
    }

    private String truncar(String texto) {
        if (texto == null) {
            return "";
        }
        return texto.length() > MAX_TEXT_CHARS ? texto.substring(0, MAX_TEXT_CHARS) + "\n[... texto truncado ...]" : texto;
    }
}
