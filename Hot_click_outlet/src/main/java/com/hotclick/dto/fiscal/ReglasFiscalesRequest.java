package com.hotclick.dto.fiscal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

/** Cuerpo de PUT /api/admin/configuracion/fiscal. Rangos iguales a los CHECK de V244. */
public record ReglasFiscalesRequest(
    @NotNull @Pattern(regexp = "SIMPLIFICADO|TRADICIONAL", message = "Régimen inválido") String regimen,
    @NotNull @DecimalMin("0") @DecimalMax("50") @Digits(integer = 2, fraction = 2) BigDecimal extraNoInscritoPct,
    @NotNull @Min(1) @Max(60) Integer diasEnviarFactura,
    @NotNull @Min(0) @Max(10_000_000) Integer onvoPagoMinimoCrc,
    @NotNull @Min(0) @Max(100_000) Integer onvoCostoPagoCrc,
    // Fase 2 (opcionales: si no vienen, no se tocan).
    Boolean mensajeReceptorHabilitado,
    @Min(0) @Max(1000) Integer toleranciaFacturaNegocioCrc,
    @Pattern(regexp = "NETO|BRUTO", message = "Base inválida") String baseFacturaNegocio) {

    /** Solo las reglas de la Fase 1 (las de la factura del negocio quedan como están). */
    public ReglasFiscalesRequest(String regimen, BigDecimal extraNoInscritoPct, Integer diasEnviarFactura,
                                 Integer onvoPagoMinimoCrc, Integer onvoCostoPagoCrc) {
        this(regimen, extraNoInscritoPct, diasEnviarFactura, onvoPagoMinimoCrc, onvoCostoPagoCrc, null, null, null);
    }
}
