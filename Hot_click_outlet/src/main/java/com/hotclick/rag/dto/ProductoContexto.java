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
    String  imagenUrl
) {}
