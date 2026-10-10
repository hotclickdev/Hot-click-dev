package com.hotclick.dto.stock;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * SEC02-01 / SEC02-03: body de POST /api/stock/ajuste-entrada/{productoId}.
 * Solo entradas positivas y acotadas; notas con el mismo tope que la columna.
 */
public record AjusteEntradaRequest(
        @NotNull(message = "La cantidad es obligatoria")
        @Min(value = AjusteEntradaRequest.CANTIDAD_MIN, message = "La cantidad debe estar entre 1 y 100000")
        @Max(value = AjusteEntradaRequest.CANTIDAD_MAX, message = "La cantidad debe estar entre 1 y 100000")
        Integer cantidad,
        @Size(max = AjusteEntradaRequest.NOTAS_MAX, message = "Las notas admiten hasta 500 caracteres")
        String notas) {

    public static final int CANTIDAD_MIN = 1;
    public static final int CANTIDAD_MAX = 100_000;
    public static final int NOTAS_MAX = 500;
}
