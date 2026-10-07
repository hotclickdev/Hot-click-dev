package com.hotclick.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Campos que el admin puede escribir. Id, estado y fechas los pone el servidor. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BlogEntradaDatos(
        String titulo,
        String slug,
        String resumen,
        String contenido,
        String imagenUrl,
        Boolean publicado) {
}
