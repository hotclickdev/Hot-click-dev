package com.hotclick.dto;

/** Categoría raíz para la barra del header: más visitada (30 días) o, sin datos, con más productos públicos. */
public record CategoriaTopDTO(Long id, String nombre, long visitas, long productos) {}
