package com.hotclick.service.extraccion;

import com.hotclick.service.BccrService;
import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public class ExtraccionPrecioExtractor {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionPrecioExtractor.class);

    @Autowired
    private BccrService bccrService;
    @Autowired
    private ExtraccionPrecioResultadosExtractor extraccionPrecioResultadosExtractor;
    @Autowired
    private ExtraccionPrecioUrlExtractor extraccionPrecioUrlExtractor;

    /** Busca precios en ecommerce usando el nombre del producto (sin Vision API). */
    public ExtraccionService.ResultadoExtraccion extraerPorNombre(String nombreProducto) {
        ExtraccionService.ResultadoExtraccion resultado = new ExtraccionService.ResultadoExtraccion();
        resultado.etiquetaPrincipal = nombreProducto;
        resultado.todasEtiquetas = List.of(nombreProducto);
        resultado.tcUsado = bccrService.getTipoCambioVenta();

        String query = nombreProducto.trim().replace(" ", "+");

        List<String> urlsBusqueda = List.of(
            "https://www.amazon.com/s?k=" + query,
            "https://www.ebay.com/sch/i.html?_nkw=" + query,
            "https://www.walmart.com/search?q=" + query,
            "https://www.newegg.com/p/pl?d=" + query
        );

        // Lanzar las 4 URLs en paralelo; timeout global 12s (vs 40s secuencial)
        List<CompletableFuture<ExtraccionService.PrecioExtraido>> futures = urlsBusqueda.stream()
            .map(url -> CompletableFuture.supplyAsync(
                () -> extraerPrecioDeResultados(url, resultado.tcUsado)))
            .toList();
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .get(12, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Extraccion interrumpida: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("Extraccion parcial o timeout: {}", e.getMessage());
        }
        futures.stream()
            .filter(f -> f.isDone() && !f.isCompletedExceptionally())
            .map(CompletableFuture::join)
            .filter(Objects::nonNull)
            .forEach(resultado.precios::add);

        if (!resultado.precios.isEmpty()) {
            resultado.promedioCrc = calcularPromedio(resultado.precios);
        } else {
            resultado.error = "No se encontraron precios para \"" + nombreProducto + "\"";
        }
        return resultado;
    }

    public ExtraccionService.ResultadoExtraccion extraer(String imagenBase64, GoogleVisionService vision) {
        VisionResult visionResult = vision.analizar(imagenBase64);
        ExtraccionService.ResultadoExtraccion resultado = new ExtraccionService.ResultadoExtraccion();
        resultado.etiquetaPrincipal = visionResult.getEtiquetaPrincipal();
        resultado.todasEtiquetas = visionResult.etiquetas;
        resultado.tcUsado = bccrService.getTipoCambioVenta();

        if (!visionResult.tieneResultados()) {
            resultado.error = "Vision API no identificó el producto";
            return resultado;
        }

        int intentos = 0;
        for (String url : visionResult.urlsEcommerce) {
            if (intentos >= 10) break;
            if (!esUrlEcommerce(url)) continue;
            intentos++;
            ExtraccionService.PrecioExtraido precio = extraerPrecioDeUrl(url, resultado.tcUsado);
            if (precio != null) {
                resultado.precios.add(precio);
            }
        }

        if (!resultado.precios.isEmpty()) {
            resultado.promedioCrc = calcularPromedio(resultado.precios);
        }

        return resultado;
    }

    ExtraccionService.PrecioExtraido extraerPrecioDeResultados(String searchUrl, int tc) {
        return extraccionPrecioResultadosExtractor.extraerPrecioDeResultados(searchUrl, tc);
    }

    public boolean esUrlEcommerce(String url) {
        return ExtraccionPrecioTextUtils.esUrlEcommerce(url);
    }

    public ExtraccionService.PrecioExtraido extraerPrecioDeUrl(String url, int tc) {
        return extraccionPrecioUrlExtractor.extraerPrecioDeUrl(url, tc);
    }

    Integer parsearPrecio(String texto) {
        return ExtraccionPrecioTextUtils.parsearPrecio(texto);
    }

    String extraerNombreFuente(String url) {
        return ExtraccionPrecioTextUtils.extraerNombreFuente(url);
    }

    int calcularPromedio(List<ExtraccionService.PrecioExtraido> precios) {
        return ExtraccionPrecioTextUtils.calcularPromedio(precios);
    }
}
