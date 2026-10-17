package com.hotclick.dto;

/**
 * Negocio del carrusel del inicio. Solo vitrina: sin WhatsApp, redes, teléfono ni correo.
 *
 * @param fotoPortada logo del negocio o, si no tiene, la foto de uno de sus productos públicos; vacío si no hay
 *                    ninguna (el frontend dibuja el placeholder de marca)
 * @param provincia   provincia de su primera bodega activa; vacío si no la cargó
 */
public record NegocioDestacadoDTO(String slug, String nombre, String categoria, String provincia,
                                  String logoUrl, String fotoPortada) {
}
