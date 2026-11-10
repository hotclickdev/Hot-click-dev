package com.hotclick.service.suscripcion;

import com.hotclick.model.Plan;

import java.math.BigDecimal;

/**
 * Copia inmutable de las columnas de un plan que exponen los listados públicos. Se arma DENTRO de la transacción del
 * lector ({@link PlanesActivosLector}): fuera de ella no viaja ninguna entidad JPA (sin lazy ni persistence context).
 */
public record PlanPublicoVista(
        Long id, String nombre, String descripcion, Integer precioMensual,
        Integer maxUsuarios, Integer maxProductos, Integer maxBodegas, Integer maxCajas,
        Boolean tienePos, Boolean tieneCrm, Boolean tieneCompras, Boolean tieneReportes,
        Boolean tieneAi, Boolean tieneApi, Boolean tieneGiftCards,
        Boolean activo, Integer maxCreditosAi, BigDecimal comisionPorcentaje, Integer comisionMinimaCrc) {

    public static PlanPublicoVista de(Plan p) {
        return new PlanPublicoVista(p.getId(), p.getNombre(), p.getDescripcion(), p.getPrecioMensual(),
            p.getMaxUsuarios(), p.getMaxProductos(), p.getMaxBodegas(), p.getMaxCajas(),
            p.getTienePos(), p.getTieneCrm(), p.getTieneCompras(), p.getTieneReportes(),
            p.getTieneAi(), p.getTieneApi(), p.getTieneGiftCards(),
            p.getActivo(), p.getMaxCreditosAi(), p.getComisionPorcentaje(), p.getComisionMinimaCrc());
    }
}
