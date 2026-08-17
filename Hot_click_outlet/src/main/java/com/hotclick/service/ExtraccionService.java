package com.hotclick.service;

import com.hotclick.service.extraccion.ExtraccionDetalleExtractor;
import com.hotclick.service.extraccion.ExtraccionPrecioExtractor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ExtraccionService {

    @Autowired
    private ExtraccionPrecioExtractor extraccionPrecioExtractor;
    @Autowired
    private ExtraccionDetalleExtractor extraccionDetalleExtractor;

    /** Busca precios en ecommerce usando el nombre del producto (sin Vision API). */
    public ResultadoExtraccion extraerPorNombre(String nombreProducto) {
        return extraccionPrecioExtractor.extraerPorNombre(nombreProducto);
    }

    public ResultadoExtraccion extraer(String imagenBase64, GoogleVisionService vision) {
        return extraccionPrecioExtractor.extraer(imagenBase64, vision);
    }

    /** Analiza una o varias imágenes y devuelve datos completos del producto (fusionando resultados). */
    public DetallesProducto extraerDetallesProducto(List<String> imagenesBase64, GoogleVisionService vision) {
        return extraccionDetalleExtractor.extraerDetallesProducto(imagenesBase64, vision);
    }

    // ---- DTOs internos ----

    public static class PrecioExtraido {
        public String fuente;
        public String url;
        public Integer precioUsd;
        public Integer precioCrc;
    }

    public static class ResultadoExtraccion {
        public String etiquetaPrincipal;
        public List<String> todasEtiquetas = new ArrayList<>();
        public List<PrecioExtraido> precios = new ArrayList<>();
        public int promedioCrc;
        public int tcUsado;
        public String error;

        public boolean tienePrecios() { return !precios.isEmpty(); }
    }

    public static class DetallesProducto {
        public String nombre;
        public String titulo;
        public List<String> todasEtiquetas = new ArrayList<>();
        public String descripcionCorta;
        public String descripcionLarga;
        public String especificaciones;
        public String comoUsar;
        public String marca;
        public String fuenteDetalles;
        public List<PrecioExtraido> precios = new ArrayList<>();
        public int promedioCrc;
        public int precioSugerido;
        public int tcUsado;
        public String error;
    }
}
