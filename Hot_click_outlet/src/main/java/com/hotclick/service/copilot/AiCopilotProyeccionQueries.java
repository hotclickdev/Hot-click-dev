package com.hotclick.service.copilot;

import com.hotclick.service.InventoryForecastService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.text.DecimalFormat;
import java.util.List;
import java.util.Map;

/**
 * Proyección a 30 días en colones, con ABC y reordenar. Sin jerga de ML.
 */
@Component
class AiCopilotProyeccionQueries {

    private static final int LIMITE_REPONER = 3;

    @Autowired private InventoryForecastService inventoryForecastService;
    @Autowired private JdbcTemplate jdbc;

    String getProyeccion(Long empresaId) {
        Map<String, Object> dash = inventoryForecastService.dashboard(empresaId);
        long proyectado = ingresosProyectados(empresaId);
        if (proyectado <= 0) {
            proyectado = ventasUltimos30d(empresaId);
        }
        return formatear(
            proyectado,
            countAbc(dash, "A"),
            countAbc(dash, "C"),
            asList(dash.get("enRiesgo")).size(),
            asList(dash.get("lentos")).size(),
            nombresReponer(asList(dash.get("enRiesgo"))));
    }

    static String formatear(long ingresos30d, int claseA, int claseC, int enRiesgo,
                            int lentos, List<String> reponer) {
        DecimalFormat fmt = new DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder();
        sb.append("Si seguís así 30 días: unas ₡").append(fmt.format(ingresos30d))
            .append(" en ventas, según lo que se está moviendo.\n");
        sb.append("Los que más venden (A): ").append(claseA)
            .append(". Los de poco movimiento (C): ").append(claseC).append(".\n");
        if (enRiesgo > 0) {
            sb.append("Reponer ahora: ").append(enRiesgo).append(" producto(s)");
            if (!reponer.isEmpty()) {
                sb.append(" — ").append(String.join(", ", reponer));
            }
            sb.append(".\n");
        }
        if (lentos > 0) {
            sb.append(lentos).append(" sin venta en 60 días: conviene oferta o bajar visibilidad.\n");
        }
        return sb.toString();
    }

    private long ingresosProyectados(Long empresaId) {
        Number n = jdbc.queryForObject("""
            SELECT COALESCE(SUM(ROUND(
                COALESCE(demanda_diaria_avg, 0) * 30
                * COALESCE(NULLIF(precio_oferta, 0), precio_venta)
            )), 0)
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
              AND visible_catalogo = TRUE AND vendido = FALSE
            """, Number.class, empresaId);
        return n != null ? n.longValue() : 0;
    }

    private long ventasUltimos30d(Long empresaId) {
        Number n = jdbc.queryForObject("""
            SELECT COALESCE(SUM(pi.precio_unitario_momento * pi.cantidad), 0)
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb pe ON pe.id_pedido = pi.fk_id_pedido
            WHERE pe.fk_id_empresa = ?
              AND pe.estado_pedido IN ('PAGADO','ENTREGADO')
              AND pe.fecha_pedido >= NOW() - INTERVAL '30 days'
            """, Number.class, empresaId);
        return n != null ? n.longValue() : 0;
    }

    private static int countAbc(Map<String, Object> dash, String clase) {
        for (Map<String, Object> row : asList(dash.get("abcResumen"))) {
            if (clase.equals(String.valueOf(row.get("clase")))) {
                Object total = row.get("total");
                return total instanceof Number n ? n.intValue() : 0;
            }
        }
        return 0;
    }

    private static List<String> nombresReponer(List<Map<String, Object>> enRiesgo) {
        return enRiesgo.stream()
            .limit(LIMITE_REPONER)
            .map(p -> String.valueOf(p.get("nombre_producto")))
            .toList();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asList(Object value) {
        if (value instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
    }
}
