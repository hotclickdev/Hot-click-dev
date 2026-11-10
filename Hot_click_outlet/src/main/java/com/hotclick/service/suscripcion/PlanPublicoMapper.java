package com.hotclick.service.suscripcion;


import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Campos públicos de un plan que comparten GET /api/planes y GET /api/billing/planes: límites y features de la tabla
 * plan. El precio NO se arma aquí: cada endpoint lo agrega desde {@link PreciosPlanesConfig#precioPublicoUsd}, la misma
 * config que {@link PrecioPlanOnvo} verifica contra ONVO.
 */
public final class PlanPublicoMapper {

    private PlanPublicoMapper() {}

    /** Mapa ordenado con id, nombre, descripción, precioMensual (legado, colones), límites y features. */
    public static Map<String, Object> base(PlanPublicoVista p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.id());
        m.put("nombre", p.nombre());
        m.put("descripcion", p.descripcion());
        m.put("precioMensual", p.precioMensual());
        m.put("maxUsuarios", p.maxUsuarios());
        m.put("maxProductos", p.maxProductos());
        m.put("maxBodegas", p.maxBodegas());
        m.put("maxCajas", p.maxCajas());
        m.put("tienePos", p.tienePos());
        m.put("tieneCrm", p.tieneCrm());
        m.put("tieneCompras", p.tieneCompras());
        m.put("tieneReportes", p.tieneReportes());
        m.put("tieneAi", p.tieneAi());
        m.put("tieneApi", p.tieneApi());
        m.put("tieneGiftCards", p.tieneGiftCards());
        return m;
    }
}
