package com.hotclick.service.copilot;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Consultas de pedidos pendientes del Copilot admin.
 * Extraído bit-idéntico de AiCopilotDataQueries — no cambia comportamiento.
 */
@Component
class AiCopilotPedidosQueries {

    @Autowired private JdbcTemplate jdbc;

    String getPedidosPendientesData(Long empresaId) {
        // Solo el nombre — el email es PII innecesaria para que el LLM
        // aconseje sobre despachos y no debe salir hacia la API de NVIDIA.
        String sql = """
            SELECT p.id_pedido, p.estado_pedido, p.total_pedido, p.fecha_pedido,
                   u.nombre AS nombre_usuario
            FROM hot_click_pedido_tb p
            LEFT JOIN hot_click_usuario_tb u ON p.fk_id_usuario_final = u.id_usuario
            WHERE p.fk_id_empresa = ?
              AND p.estado_pedido IN ('PAGADO','PROCESANDO','PREPARANDO')
            ORDER BY p.fecha_pedido ASC LIMIT 15
            """;
        var pedidos = jdbc.queryForList(sql, empresaId);
        if (pedidos.isEmpty()) return "No hay pedidos pendientes en este momento.\n";
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("%d pedidos pendientes de despachar:%n", pedidos.size()));
        pedidos.forEach(p -> sb.append(String.format("  #%s [%s] ₡%s — %s%n",
            p.get("id_pedido"), p.get("estado_pedido"),
            fmt.format(p.get("total_pedido")),
            p.get("nombre_usuario"))));
        return sb.toString();
    }

    int countPedidosPendientes(Long empresaId) {
        String sql = """
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND estado_pedido IN ('PAGADO','PROCESANDO','PREPARANDO')
            """;
        Integer count = jdbc.queryForObject(sql, Integer.class, empresaId);
        return count != null ? count : 0;
    }
}
