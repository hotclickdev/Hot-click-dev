package com.hotclick.dto;

import java.util.List;

/**
 * Resultado de la generación de ficha de producto con IA.
 * Retornado por POST /api/admin/productos/generar-ia para pre-llenar el formulario.
 */
public record AiProductoGeneradoDTO(
    String tituloComericial,
    String descripcionOptimizadaSeo,
    List<String> etiquetasBusqueda,
    int creditosRestantes   // -1 = ilimitado (plan Enterprise/ADMIN)
) {}
