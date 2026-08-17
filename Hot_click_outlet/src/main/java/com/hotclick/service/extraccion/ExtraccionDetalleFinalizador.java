package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
class ExtraccionDetalleFinalizador {

    @Autowired
    private ExtraccionDetalleFallbackGenerator extraccionDetalleFallbackGenerator;

    void aplicarGarantiaFinal(ExtraccionService.DetallesProducto d, VisionResult visionResult) {
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
    }
}
