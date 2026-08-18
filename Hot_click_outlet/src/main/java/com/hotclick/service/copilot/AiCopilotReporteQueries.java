package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.text.DecimalFormat;
import java.util.Map;

/**
 * Reporte operativo del copilot (siempre disponible, no depende del feature de finanzas).
 */
@Component
class AiCopilotReporteQueries {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private AiCopilotStockQueries stockQueries;

    String getReporteNegocio(Long empresaId, JsonNode args) {
        String periodo = args != null && args.hasNonNull("periodo") ? args.get("periodo").asText() : "30d";
        String intervalo = switch (periodo) {
            case "hoy" -> "DATE(fecha_pedido) = CURRENT_DATE";
            case "7d" -> "fecha_pedido >= NOW() - INTERVAL '7 days'";
            default -> "fecha_pedido >= NOW() - INTERVAL '30 days'";
        };
        DecimalFormat fmt = new DecimalFormat("#,###");
        Map<String, Object> kpis = jdbc.queryForMap(
            "SELECT COUNT(*) as pedidos, COALESCE(SUM(total_pedido),0) as ingresos "
                + "FROM hot_click_pedido_tb WHERE fk_id_empresa = ? AND " + intervalo
                + " AND estado_pedido IN ('PAGADO','ENTREGADO')",
            empresaId);
        StringBuilder sb = new StringBuilder();
        sb.append("Reporte ").append(periodo).append('\n');
        sb.append(String.format("Pedidos: %s / ingresos ₡%s%n", kpis.get("pedidos"), fmt.format(kpis.get("ingresos"))));
        sb.append(topVentas(empresaId, fmt));
        sb.append(stockQueries.getInventarioData(empresaId));
        sb.append(stockQueries.getProductosSinVentaData(empresaId));
        return sb.toString();
    }

    private String topVentas(Long empresaId, DecimalFormat fmt) {
        var top = jdbc.queryForList("""
            SELECT p.nombre_producto, SUM(pi.cantidad) as veces, SUM(pi.subtotal_item) as total
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
            WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '30 days'
              AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
            GROUP BY p.nombre_producto ORDER BY veces DESC LIMIT 5
            """, empresaId);
        if (top.isEmpty()) return "Sin ventas en 30 días.\n";
        StringBuilder sb = new StringBuilder("Top 30 días:\n");
        top.forEach(p -> sb.append(String.format("  - %s: %s uds / ₡%s%n",
            p.get("nombre_producto"), p.get("veces"), fmt.format(p.get("total")))));
        return sb.toString();
    }
}
