package com.hotclick.dto;

/** Categoría con productos visibles en el catálogo público; alimenta header, Home y /categorias. */
public record CategoriaConProductosDTO(Long id, String nombre, long cantidad, String fotoUrl) {

    /** Fila de ProductoRepository.contarCatalogoPublicoPorCategoria: id, nombre, cantidad, foto. */
    public static CategoriaConProductosDTO desdeFila(Object[] fila) {
        return new CategoriaConProductosDTO(
            ((Number) fila[0]).longValue(),
            (String) fila[1],
            ((Number) fila[2]).longValue(),
            (String) fila[3]);
    }
}
