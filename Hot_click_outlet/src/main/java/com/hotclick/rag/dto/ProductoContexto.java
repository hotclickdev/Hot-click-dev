package com.hotclick.rag.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Proyección de un producto recuperado por la búsqueda semántica.
 * Se serializa en el ChatResponse.productos para que el frontend
 * renderice tarjetas interactivas sin consultar /api/productos/{id}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductoContexto(
    Long    id,
    String  nombre,
    String  sku,
    Integer precio,
    String  descripcionCorta,
    String  imagenUrl,
    Integer stock,
    String  tags,
    String  categoria,
    String  especificaciones,
    String  comoUsar,
    Boolean esPersonalizado,
    String  modoPrecioPersonalizado,
    Integer precioPersonalizadoMin,
    Integer precioPersonalizadoMax,
    String  instruccionesPersonalizacion,
    String  precioEtiqueta,
    String  descripcionLarga
) {
    /** Constructor de catálogo simple (tests / productos sin personalización). */
    public ProductoContexto(Long id, String nombre, String sku, Integer precio,
                            String descripcionCorta, String imagenUrl, Integer stock,
                            String tags, String categoria, String especificaciones, String comoUsar) {
        this(id, nombre, sku, precio, descripcionCorta, imagenUrl, stock, tags, categoria,
            especificaciones, comoUsar, false, null, null, null, null,
            precio != null && precio > 0 ? "₡" + precio : "A cotizar", null);
    }

    /** Constructor con campos de personalizado (sin descripción larga). */
    public ProductoContexto(Long id, String nombre, String sku, Integer precio,
                            String descripcionCorta, String imagenUrl, Integer stock,
                            String tags, String categoria, String especificaciones, String comoUsar,
                            Boolean esPersonalizado, String modoPrecioPersonalizado,
                            Integer precioPersonalizadoMin, Integer precioPersonalizadoMax,
                            String instruccionesPersonalizacion, String precioEtiqueta) {
        this(id, nombre, sku, precio, descripcionCorta, imagenUrl, stock, tags, categoria,
            especificaciones, comoUsar, esPersonalizado, modoPrecioPersonalizado,
            precioPersonalizadoMin, precioPersonalizadoMax, instruccionesPersonalizacion,
            precioEtiqueta, null);
    }
}
