package com.hotclick.service.suscripcion;

import com.hotclick.exception.PlanSinPrecioException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Optional;

/**
 * Precio mensual en USD por plan, leído SOLO de configuración (sin valores por defecto en código).
 * Si la propiedad viene vacía, el plan no tiene precio y quien lo pida recibe {@link PlanSinPrecioException}.
 */
@Component
public class PreciosPlanesConfig {

    private final BigDecimal emprendedor;
    private final BigDecimal pyme;
    private final BigDecimal negocioPlus;

    public PreciosPlanesConfig(
            @Value("${hotclick.planes.emprendedor.precio-mensual-usd:}") String emprendedor,
            @Value("${hotclick.planes.pyme.precio-mensual-usd:}") String pyme,
            @Value("${hotclick.planes.negocio-plus.precio-mensual-usd:}") String negocioPlus) {
        this.emprendedor = parse(emprendedor);
        this.pyme = parse(pyme);
        this.negocioPlus = parse(negocioPlus);
    }

    static BigDecimal parse(String v) {
        if (v == null || v.isBlank()) return null;
        try {
            BigDecimal d = new BigDecimal(v.trim());
            return d.signum() > 0 ? d : null; // 0 o negativo = sin precio
        } catch (NumberFormatException e) {
            return null; // valor mal escrito = sin precio (409), nunca 0
        }
    }

    public Optional<BigDecimal> precioUsd(String nombrePlan) {
        if (nombrePlan == null) return Optional.empty();
        return Optional.ofNullable(switch (nombrePlan.toUpperCase(Locale.ROOT)) {
            case "EMPRENDEDOR" -> emprendedor;
            case "PYME" -> pyme;
            case "NEGOCIO_PLUS" -> negocioPlus;
            default -> null;
        });
    }

    /** Precio configurado y mayor que 0, o 409 PLAN_SIN_PRECIO (0 o negativo cuenta como sin precio). */
    public BigDecimal requerir(String nombrePlan) {
        return precioUsd(nombrePlan).filter(v -> v.signum() > 0)
            .orElseThrow(() -> new PlanSinPrecioException(nombrePlan));
    }
}
