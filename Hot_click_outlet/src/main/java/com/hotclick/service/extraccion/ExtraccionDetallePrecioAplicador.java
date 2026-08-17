package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
class ExtraccionDetallePrecioAplicador {

    @Autowired
    private ExtraccionPrecioExtractor extraccionPrecioExtractor;

    void aplicarPrecios(ExtraccionService.DetallesProducto d, VisionResult visionResult) {
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
    }
}
