package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
class ExtraccionDetalleWebComplemento {

    @Autowired
    private ExtraccionUrlDetalleExtractor extraccionUrlDetalleExtractor;
    @Autowired
    private ExtraccionWebBusquedaDetalleExtractor extraccionWebBusquedaDetalleExtractor;

    void completarConBusquedaWeb(ExtraccionService.DetallesProducto d, VisionResult visionResult) {
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
}
