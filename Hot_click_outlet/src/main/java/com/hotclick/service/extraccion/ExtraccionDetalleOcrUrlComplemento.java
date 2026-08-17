package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service
class ExtraccionDetalleOcrUrlComplemento {

    @Autowired
    private ExtraccionPrecioExtractor extraccionPrecioExtractor;
    @Autowired
    private ExtraccionOcrDetalleExtractor extraccionOcrDetalleExtractor;
    @Autowired
    private ExtraccionUrlDetalleExtractor extraccionUrlDetalleExtractor;

    void completarConOcrYScraping(ExtraccionService.DetallesProducto d, VisionResult visionResult) {
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
}
