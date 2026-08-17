package com.hotclick.service.extraccion;

import com.hotclick.service.BccrService;
import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GeminiService;
import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class ExtraccionDetalleExtractor {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionDetalleExtractor.class);

    @Autowired
    private BccrService bccrService;
    @Autowired
    private GeminiService geminiService;
    @Autowired
    private ExtraccionPrecioExtractor extraccionPrecioExtractor;
    @Autowired
    private ExtraccionOcrDetalleExtractor extraccionOcrDetalleExtractor;
    @Autowired
    private ExtraccionUrlDetalleExtractor extraccionUrlDetalleExtractor;
    @Autowired
    private ExtraccionWebBusquedaDetalleExtractor extraccionWebBusquedaDetalleExtractor;
    @Autowired
    private ExtraccionDetalleFallbackGenerator extraccionDetalleFallbackGenerator;

    /** Analiza una o varias imágenes y devuelve datos completos del producto (fusionando resultados). */
    public ExtraccionService.DetallesProducto extraerDetallesProducto(List<String> imagenesBase64, GoogleVisionService vision) {
        VisionResult visionResult = fusionarVisionResults(imagenesBase64, vision);
        return extraerDetallesDeVisionResult(visionResult, imagenesBase64);
    }

    VisionResult fusionarVisionResults(List<String> imagenesBase64, GoogleVisionService vision) {
        VisionResult merged = null;
        for (String b64 : imagenesBase64) {
            VisionResult r = vision.analizar(b64);
            // OCR en llamada separada para no interferir con WEB_DETECTION
            String ocr = vision.extraerTextoOcr(b64);
            if (!ocr.isBlank()) r.textoOcr = ocr;

            if (merged == null) {
                merged = r;
            } else {
                for (String etiqueta : r.etiquetas)
                    if (!merged.etiquetas.contains(etiqueta)) merged.etiquetas.add(etiqueta);
                for (String url : r.urlsEcommerce)
                    if (!merged.urlsEcommerce.contains(url)) merged.urlsEcommerce.add(url);
                for (GoogleVisionService.WebEntity we : r.webEntities)
                    if (merged.webEntities.stream().noneMatch(e -> e.description.equals(we.description)))
                        merged.webEntities.add(we);
                for (String lf : r.labelsFisicos)
                    if (!merged.labelsFisicos.contains(lf)) merged.labelsFisicos.add(lf);
                if (!r.textoOcr.isBlank()) {
                    merged.textoOcr = merged.textoOcr.isBlank()
                        ? r.textoOcr
                        : merged.textoOcr + "\n---\n" + r.textoOcr;
                }
            }
        }
        return merged != null ? merged : new VisionResult();
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
        boolean geminiCompleto = false;
        try {
            GeminiService.ProductoIA ia = geminiService.analizarProducto(imagenesBase64);
            if (ia != null) {
                // Validar nombre de Gemini: si Vision identificó etiquetas, el nombre
                // de Gemini debe ser coherente con ellas. Si no lo es, preferir la etiqueta de Vision.
                if (ia.nombre != null) {
                    boolean nombreCoherente = d.todasEtiquetas.isEmpty() ||
                        d.todasEtiquetas.stream().anyMatch(e ->
                            ia.nombre.toLowerCase().contains(e.toLowerCase().split(" ")[0]) ||
                            e.toLowerCase().contains(ia.nombre.toLowerCase().split(" ")[0])
                        );
                    if (nombreCoherente) {
                        d.nombre = ia.nombre;
                    } else if (d.nombre == null) {
                        // Gemini tiene nombre pero no es coherente con Vision — usar Vision
                        d.nombre = visionResult.getEtiquetaPrincipal();
                        log.info("Nombre Gemini '{}' no coincide con etiquetas Vision, usando: {}", ia.nombre, d.nombre);
                    }
                }
                if (ia.marca           != null) d.marca           = ia.marca;
                if (ia.descripcionCorta != null) d.descripcionCorta = ia.descripcionCorta;
                if (ia.especificaciones != null) d.especificaciones = ia.especificaciones;
                if (ia.comoUsar        != null) d.comoUsar        = ia.comoUsar;
                geminiCompleto = d.descripcionCorta != null && d.especificaciones != null && d.comoUsar != null;
                log.info("Gemini: nombre={}, completo={}", d.nombre, geminiCompleto);
            }
        } catch (Exception e) {
            log.warn("Gemini falló, usando fallbacks: {}", e.getMessage());
        }

        // ── 1-2. OCR y scraping: solo si Gemini no completó todos los campos ───────
        if (!geminiCompleto) {
            ExtraccionService.DetallesProducto ocr = extraccionOcrDetalleExtractor.extraerDetallesDeOcr(visionResult.textoOcr);
            if (ocr != null) {
                if (ocr.descripcionCorta != null && d.descripcionCorta == null) d.descripcionCorta = ocr.descripcionCorta;
                if (ocr.especificaciones  != null && d.especificaciones  == null) d.especificaciones  = ocr.especificaciones;
                if (ocr.comoUsar          != null && d.comoUsar          == null) d.comoUsar          = ocr.comoUsar;
            }
            if (d.nombre == null && !visionResult.textoOcr.isBlank()) {
                d.nombre = Arrays.stream(visionResult.textoOcr.split("\n"))
                    .map(String::trim)
                    .filter(l -> l.length() > 4 && l.length() < 60
                        && !l.matches("(?i)^(ingredients?|nutrition|directions?|contenido|ingredientes|"
                            + "warnings?|caution|cantidad|net weight|peso neto|www\\..*).*"))
                    .findFirst().orElse(null);
            }

            // Scraping de páginas de producto (solo si Gemini no completó)
            for (String url : visionResult.urlsEcommerce) {
                if (!extraccionPrecioExtractor.esUrlEcommerce(url)) continue;
                if (ExtraccionDetalleTextUtils.esPaginaDeResultados(url)) continue;
                if (d.descripcionCorta != null && d.especificaciones != null && d.comoUsar != null) break;
                ExtraccionService.DetallesProducto scraped = extraccionUrlDetalleExtractor.extraerDetallesDeUrl(url);
                if (scraped != null) {
                    if (scraped.nombre != null && !scraped.nombre.isBlank() && d.nombre == null) d.nombre = scraped.nombre;
                    if (d.descripcionCorta == null) d.descripcionCorta = scraped.descripcionCorta;
                    if (d.descripcionLarga == null) d.descripcionLarga = scraped.descripcionLarga;
                    if (d.especificaciones == null) d.especificaciones = scraped.especificaciones;
                    if (d.comoUsar         == null) d.comoUsar         = scraped.comoUsar;
                    if (d.marca            == null) d.marca            = scraped.marca;
                    if (d.fuenteDetalles   == null) d.fuenteDetalles   = scraped.fuenteDetalles;
                }
            }
        }

        // ── 3. Extraer precios de hasta 8 URLs ───────────────────────────────────
        int intentos = 0;
        for (String url : visionResult.urlsEcommerce) {
            if (intentos >= 8) break;
            if (!extraccionPrecioExtractor.esUrlEcommerce(url)) continue;
            intentos++;
            ExtraccionService.PrecioExtraido precio = extraccionPrecioExtractor.extraerPrecioDeUrl(url, d.tcUsado);
            if (precio != null) d.precios.add(precio);
        }
        if (!d.precios.isEmpty()) {
            d.promedioCrc = extraccionPrecioExtractor.calcularPromedio(d.precios);
            d.precioSugerido = (int)(d.promedioCrc * 1.13 * 1.25 * 1.20);
        }

        // ── 4 y 4.5. Búsquedas por nombre/web: solo si Gemini no completó ──────────
        if (!geminiCompleto) {
            String terminoBusqueda = d.nombre;
            if (terminoBusqueda == null && !d.todasEtiquetas.isEmpty())
                terminoBusqueda = d.todasEtiquetas.get(0);
            if (terminoBusqueda == null && !visionResult.labelsFisicos.isEmpty())
                terminoBusqueda = visionResult.labelsFisicos.get(0);

            if (d.descripcionCorta == null && terminoBusqueda != null)
                d.descripcionCorta = extraccionWebBusquedaDetalleExtractor.buscarDescripcionPorNombre(terminoBusqueda);
            if (d.especificaciones == null && terminoBusqueda != null)
                d.especificaciones = extraccionWebBusquedaDetalleExtractor.buscarEspecificacionesPorNombre(terminoBusqueda);

            boolean faltaCampo = d.descripcionCorta == null || d.especificaciones == null || d.comoUsar == null;
            boolean tieneBase  = terminoBusqueda != null || !visionResult.labelsFisicos.isEmpty();
            if (faltaCampo && tieneBase) {
                String baseSearch = terminoBusqueda != null ? terminoBusqueda
                    : visionResult.labelsFisicos.get(0);
                List<String> webUrls = extraccionWebBusquedaDetalleExtractor.buscarUrlsProductoEnWeb(baseSearch, d.todasEtiquetas);
                for (String url : webUrls) {
                    if (d.descripcionCorta != null && d.especificaciones != null && d.comoUsar != null) break;
                    ExtraccionService.DetallesProducto scraped = extraccionUrlDetalleExtractor.extraerDetallesDeUrl(url);
                    if (scraped != null) {
                        if (d.descripcionCorta == null) d.descripcionCorta = scraped.descripcionCorta;
                        if (d.descripcionLarga == null) d.descripcionLarga = scraped.descripcionLarga;
                        if (d.especificaciones == null) d.especificaciones = scraped.especificaciones;
                        if (d.comoUsar         == null) d.comoUsar         = scraped.comoUsar;
                        if (d.marca            == null) d.marca            = scraped.marca;
                        if (d.fuenteDetalles   == null) d.fuenteDetalles   = scraped.fuenteDetalles;
                    }
                }
            }
        }

        // ── 5. Garantía final: los tres campos siempre tienen texto ──────────────
        // Combinar todas las señales disponibles para los generadores
        List<String> todasSeñales = new ArrayList<>(d.todasEtiquetas);
        visionResult.labelsFisicos.forEach(l -> { if (!todasSeñales.contains(l)) todasSeñales.add(l); });
        String nombreFinal = d.nombre != null ? d.nombre
            : (!todasSeñales.isEmpty() ? todasSeñales.get(0) : null);

        if (d.descripcionCorta == null)
            d.descripcionCorta = extraccionDetalleFallbackGenerator.construirDescripcionDeEtiquetas(nombreFinal, todasSeñales);
        if (d.especificaciones == null)
            d.especificaciones = extraccionDetalleFallbackGenerator.construirEspecificacionesDeLabels(nombreFinal, visionResult.labelsFisicos, todasSeñales);
        if (d.comoUsar == null)
            d.comoUsar = extraccionDetalleFallbackGenerator.generarComoUsar(nombreFinal, todasSeñales);

        // Truncar respetando los límites del formulario
        if (d.nombre == null) d.nombre = nombreFinal;
        d.nombre           = ExtraccionDetalleTextUtils.truncar(d.nombre, 80);
        d.titulo           = ExtraccionDetalleTextUtils.truncar(d.nombre, 40);
        d.descripcionCorta = ExtraccionDetalleTextUtils.truncar(ExtraccionDetalleTextUtils.limpiarDescripcion(d.descripcionCorta), 200);
        d.especificaciones = ExtraccionDetalleTextUtils.truncar(d.especificaciones, 500);
        d.comoUsar         = ExtraccionDetalleTextUtils.truncar(d.comoUsar, 150);
        d.marca            = ExtraccionDetalleTextUtils.truncar(d.marca, 98);
        return d;
    }
}
