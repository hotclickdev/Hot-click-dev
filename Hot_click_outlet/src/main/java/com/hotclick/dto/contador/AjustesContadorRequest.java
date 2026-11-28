package com.hotclick.dto.contador;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** Cuerpo de PUT /api/admin/contador/ajustes. Rangos iguales a los CHECK de V263. */
public record AjustesContadorRequest(
    @NotNull @Min(100_000) @Max(5_000_000) Integer salarioBaseCrc,
    @NotNull @DecimalMin("0") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal topeIaMesUsd,
    @NotNull @Min(1) @Max(500) Integer limitePreguntasDia) {}
