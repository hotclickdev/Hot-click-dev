package com.hotclick.dto;

/**
 * Negocio para el directorio y el buscador del visitante. Solo datos de vitrina: sin WhatsApp, Instagram,
 * teléfono ni correo (el contacto del vendedor solo sale en la ficha de tienda y solo con PYME/NEGOCIO_PLUS).
 *
 * @param plan plan público normalizado: {@code EMPRENDEDOR}, {@code PYME} o {@code NEGOCIO_PLUS}
 */
public record NegocioPublicoDTO(String slug, String nombre, String logoUrl, String categoria, String plan, long productos) {
}
