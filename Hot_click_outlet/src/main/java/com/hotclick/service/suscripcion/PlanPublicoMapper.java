package com.hotclick.service.suscripcion;

import com.hotclick.model.Plan;
import org.springframework.data.domain.Sort;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Campos públicos de un plan que comparten GET /api/planes y GET /api/billing/planes: límites y features de la tabla
 * plan. El precio NO se arma aquí: cada endpoint lo agrega desde {@link PreciosPlanesConfig#precioPublicoUsd}, la misma
 * config que {@link PrecioPlanOnvo} verifica contra ONVO.
 */
public final class PlanPublicoMapper {

    private PlanPublicoMapper() {}

    /**
     * Lectura de los planes activos para los listados públicos: TODOS los activos (sin filtrar por nombre), en páginas
     * acotadas con orden estable (precio_mensual ascendente, desempate por id). El llamador recorre todas las páginas con
     * {@link com.hotclick.utils.PaginasCompletas}; si hubiera más de {@link #MAX_PAGINAS} falla, nunca trunca.
     */
    public static final Sort ORDEN = Sort.by(Sort.Order.asc("precioMensual"), Sort.Order.asc("id"));
    public static final int TAMANO_PAGINA = 50;
    public static final int MAX_PAGINAS = 20;

    /** Mapa ordenado con id, nombre, descripción, precioMensual (legado, colones), límites y features. */
    public static Map<String, Object> base(Plan p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("nombre", p.getNombre());
        m.put("descripcion", p.getDescripcion());
        m.put("precioMensual", p.getPrecioMensual());
        m.put("maxUsuarios", p.getMaxUsuarios());
        m.put("maxProductos", p.getMaxProductos());
        m.put("maxBodegas", p.getMaxBodegas());
        m.put("maxCajas", p.getMaxCajas());
        m.put("tienePos", p.getTienePos());
        m.put("tieneCrm", p.getTieneCrm());
        m.put("tieneCompras", p.getTieneCompras());
        m.put("tieneReportes", p.getTieneReportes());
        m.put("tieneAi", p.getTieneAi());
        m.put("tieneApi", p.getTieneApi());
        m.put("tieneGiftCards", p.getTieneGiftCards());
        return m;
    }
}
