package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GeminiService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
class ExtraccionGeminiDetalleExtractor {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionGeminiDetalleExtractor.class);

    @Autowired
    private GeminiService geminiService;

    boolean aplicarGemini(ExtraccionService.DetallesProducto d, VisionResult visionResult, List<String> imagenesBase64) {
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
                if (ia.ambientes != null && !ia.ambientes.isEmpty()) {
                    d.todasEtiquetas = new java.util.ArrayList<>(d.todasEtiquetas);
                    for (String ambiente : ia.ambientes) {
                        if (ambiente != null && !ambiente.isBlank() && !d.todasEtiquetas.contains(ambiente)) {
                            d.todasEtiquetas.add(ambiente);
                        }
                    }
                }
                geminiCompleto = d.descripcionCorta != null && d.especificaciones != null && d.comoUsar != null;
                log.info("Gemini: nombre={}, completo={}", d.nombre, geminiCompleto);
            }
        } catch (Exception e) {
            log.warn("Gemini falló, usando fallbacks: {}", e.getMessage());
        }
        return geminiCompleto;
    }
}
