package com.hotclick.service.extraccion;

import com.hotclick.service.BccrService;
import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ExtraccionDetalleExtractor {

    @Autowired
    private BccrService bccrService;
    @Autowired
    private ExtraccionVisionResultMerger extraccionVisionResultMerger;
    @Autowired
    private ExtraccionGeminiDetalleExtractor extraccionGeminiDetalleExtractor;
    @Autowired
    private ExtraccionDetalleOcrUrlComplemento extraccionDetalleOcrUrlComplemento;
    @Autowired
    private ExtraccionDetallePrecioAplicador extraccionDetallePrecioAplicador;
    @Autowired
    private ExtraccionDetalleWebComplemento extraccionDetalleWebComplemento;
    @Autowired
    private ExtraccionDetalleFinalizador extraccionDetalleFinalizador;

    /** Analiza una o varias imágenes y devuelve datos completos del producto (fusionando resultados). */
    public ExtraccionService.DetallesProducto extraerDetallesProducto(List<String> imagenesBase64, GoogleVisionService vision) {
        VisionResult visionResult = extraccionVisionResultMerger.fusionarVisionResults(imagenesBase64, vision);
        return extraerDetallesDeVisionResult(visionResult, imagenesBase64);
    }

    ExtraccionService.DetallesProducto extraerDetallesDeVisionResult(VisionResult visionResult, List<String> imagenesBase64) {
        ExtraccionService.DetallesProducto d = new ExtraccionService.DetallesProducto();
        d.tcUsado = bccrService.getTipoCambioVenta();

        // Nombre: webEntity de alto score → categoría física → null (se llenará más adelante)
        String nombrePrincipal = visionResult.getEtiquetaPrincipal();
        if (nombrePrincipal == null || nombrePrincipal.endsWith("?"))
            nombrePrincipal = visionResult.getCategoriaFisica();
        d.nombre = nombrePrincipal;
        d.todasEtiquetas = new ArrayList<>(visionResult.etiquetas);

        // ── 0. Gemini AI: análisis directo de la imagen (más preciso que scraping) ─
        boolean geminiCompleto = extraccionGeminiDetalleExtractor.aplicarGemini(d, visionResult, imagenesBase64);

        // ── 1-2. OCR y scraping: solo si Gemini no completó todos los campos ───────
        if (!geminiCompleto) {
            extraccionDetalleOcrUrlComplemento.completarConOcrYScraping(d, visionResult);
        }

        // ── 3. Extraer precios de hasta 8 URLs ───────────────────────────────────
        extraccionDetallePrecioAplicador.aplicarPrecios(d, visionResult);

        // ── 4 y 4.5. Búsquedas por nombre/web: solo si Gemini no completó ──────────
        if (!geminiCompleto) {
            extraccionDetalleWebComplemento.completarConBusquedaWeb(d, visionResult);
        }

        // ── 5. Garantía final: los tres campos siempre tienen texto ──────────────
        extraccionDetalleFinalizador.aplicarGarantiaFinal(d, visionResult);
        return d;
    }
}
