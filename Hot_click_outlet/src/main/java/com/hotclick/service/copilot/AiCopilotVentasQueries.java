package com.hotclick.service.copilot;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Consultas de ventas del Copilot admin.
 * Extraído bit-idéntico de AiCopilotDataQueries — no cambia comportamiento.
 */
@Component
class AiCopilotVentasQueries {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotVentasQueries.class);

    @Autowired private JdbcTemplate jdbc;
    @Autowired private AiCopilotStockQueries stockQueries;
    @Autowired private AiCopilotClientesQueries clientesQueries;

    String getVentasData(Long empresaId) {
        String sqlHoy = """
            SELECT COUNT(*) as pedidos, COALESCE(SUM(total_pedido),0) as ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND DATE(fecha_pedido) = CURRENT_DATE
              AND estado_pedido IN ('PAGADO','ENTREGADO')
            """;
        String sql30d = """
            SELECT COUNT(*) as pedidos, COALESCE(SUM(total_pedido),0) as ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= NOW() - INTERVAL '30 days'
              AND estado_pedido IN ('PAGADO','ENTREGADO')
            """;
        String sqlTopProds = """
            SELECT p.nombre_producto, SUM(pi.cantidad) as veces, SUM(pi.subtotal_item) as total
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
            WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '30 days'
              AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
            GROUP BY p.nombre_producto ORDER BY veces DESC LIMIT 5
            """;
        var hoy  = jdbc.queryForMap(sqlHoy,  empresaId);
        var m30  = jdbc.queryForMap(sql30d, empresaId);
        var top  = jdbc.queryForList(sqlTopProds, empresaId);
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Hoy: %s pedidos / ₡%s ingresos%n",
            hoy.get("pedidos"), fmt.format(hoy.get("ingresos"))));
        sb.append(String.format("Últimos 30 días: %s pedidos / ₡%s ingresos%n",
            m30.get("pedidos"), fmt.format(m30.get("ingresos"))));
        if (!top.isEmpty()) {
            sb.append("Top productos más vendidos (30d):\n");
            top.forEach(p -> sb.append(String.format("  - %s: %s ventas / ₡%s%n",
                p.get("nombre_producto"), p.get("veces"), fmt.format(p.get("total")))));
        }
        sb.append(stockQueries.getProductosSinVentaData(empresaId));
        sb.append(clientesQueries.getClientesPorProductoData(empresaId));
        return sb.toString();
    }

    String getKpiContext(Long empresaId) {
        try {
            String sqlKpis = """
                SELECT COUNT(*) as pedidos_7d,
                       COALESCE(SUM(total_pedido),0) as ingresos_7d
                FROM hot_click_pedido_tb
                WHERE fk_id_empresa = ? AND fecha_pedido >= NOW() - INTERVAL '7 days'
                  AND estado_pedido IN ('PAGADO','ENTREGADO')
                """;
            Map<String, Object> kpis = jdbc.queryForMap(sqlKpis, empresaId);
            java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
            return String.format("Pedidos últimos 7 días: %s | Ingresos: ₡%s",
                kpis.get("pedidos_7d"), fmt.format(kpis.get("ingresos_7d")));
        } catch (DataAccessException e) {
            log.warn("[AI] empresaId={} KPI no disponible: {}", empresaId, e.getMessage());
            return "Datos no disponibles";
        }
    }
}
