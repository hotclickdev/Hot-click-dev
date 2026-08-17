package com.hotclick.service.copilot;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Carga de contexto SQL para cross-sell — extraído bit-idéntico de {@link AiCopilotCrossSellService}.
 */
@Component
class AiCopilotCrossSellContextLoader {

    @Autowired private JdbcTemplate jdbc;

    record CrossSellContext(String nombreCliente, List<String> comprados, List<Map<String, Object>> candidatos) {}

    CrossSellContext cargar(Long empresaId, Long clienteId) {
        List<String> nombreRows = jdbc.queryForList(
            "SELECT nombre FROM hot_click_usuario_tb WHERE id_usuario = ?", String.class, clienteId);
        String nombreCliente = nombreRows.isEmpty() ? "el cliente" : nombreRows.get(0);

        List<String> comprados = jdbc.queryForList("""
            SELECT DISTINCT p.nombre_producto
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
            WHERE ped.fk_id_usuario_final = ? AND ped.fk_id_empresa = ?
            ORDER BY p.nombre_producto LIMIT 15
            """, String.class, clienteId, empresaId);
        if (comprados.isEmpty()) return null;

        var candidatos = jdbc.queryForList("""
            SELECT pr.nombre_producto, pr.precio_venta
            FROM hot_click_producto_tb pr
            WHERE pr.fk_id_empresa = ? AND pr.fk_id_estado = 1 AND pr.visible_catalogo = TRUE
              AND (pr.stock_actual - COALESCE(pr.stock_reservado, 0)) > 0
              AND pr.fk_id_categoria IN (
                  SELECT DISTINCT pr2.fk_id_categoria
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  JOIN hot_click_producto_tb pr2 ON pi.fk_id_producto = pr2.id_producto
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
              AND pr.id_producto NOT IN (
                  SELECT pi.fk_id_producto
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
            ORDER BY pr.id_producto DESC
            LIMIT 10
            """, empresaId, clienteId, empresaId, clienteId, empresaId);
        if (candidatos.isEmpty()) return null;

        return new CrossSellContext(nombreCliente, comprados, candidatos);
    }

    String armarDatosPrompt(CrossSellContext ctx) {
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder datos = new StringBuilder();
        datos.append("Cliente: ").append(ctx.nombreCliente()).append("\n");
        datos.append("Ya compró: ").append(String.join(", ", ctx.comprados())).append("\n\n");
        datos.append("Productos disponibles que aún no compró (mismas categorías de interés):\n");
        ctx.candidatos().forEach(p -> datos.append(String.format("  - %s — ₡%s%n",
            p.get("nombre_producto"), fmt.format(p.get("precio_venta")))));
        return datos.toString();
    }
}
