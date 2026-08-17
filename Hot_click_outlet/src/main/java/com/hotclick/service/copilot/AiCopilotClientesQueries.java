package com.hotclick.service.copilot;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Consultas de clientes del Copilot admin.
 * Extraído bit-idéntico de AiCopilotDataQueries — no cambia comportamiento.
 */
@Component
class AiCopilotClientesQueries {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private UsuarioRepository usuarioRepository;

    /** Top 3 clientes por cada uno de los productos más vendidos (90d) — responde "quién me compra tal producto". */
    String getClientesPorProductoData(Long empresaId) {
        String sql = """
            WITH ventas AS (
                SELECT p.nombre_producto, u.nombre AS nombre_usuario,
                       COUNT(*) AS veces,
                       ROW_NUMBER() OVER (PARTITION BY p.nombre_producto ORDER BY COUNT(*) DESC) AS rn
                FROM hot_click_pedido_item_tb pi
                JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
                JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
                LEFT JOIN hot_click_usuario_tb u ON ped.fk_id_usuario_final = u.id_usuario
                WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '90 days'
                  AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
                GROUP BY p.nombre_producto, u.nombre, u.id_usuario
            ),
            top_productos AS (
                SELECT nombre_producto, SUM(veces) AS total_veces
                FROM ventas GROUP BY nombre_producto ORDER BY total_veces DESC LIMIT 6
            )
            SELECT v.nombre_producto, v.nombre_usuario, v.veces
            FROM ventas v
            JOIN top_productos tp ON tp.nombre_producto = v.nombre_producto
            WHERE v.rn <= 3
            ORDER BY tp.total_veces DESC, v.nombre_producto, v.veces DESC
            """;
        var filas = jdbc.queryForList(sql, empresaId);
        if (filas.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("\nClientes recurrentes por producto (90d):\n");
        String productoActual = null;
        for (var f : filas) {
            String nombreProducto = (String) f.get("nombre_producto");
            if (!nombreProducto.equals(productoActual)) {
                sb.append(String.format("  %s:%n", nombreProducto));
                productoActual = nombreProducto;
            }
            Object cliente = f.get("nombre_usuario");
            sb.append(String.format("    - %s (%s compras)%n",
                cliente != null ? cliente : "Cliente sin cuenta", f.get("veces")));
        }
        return sb.toString();
    }

    /** Lista de clientes del negocio (compraron al menos una vez, o se registraron con esta empresa). */
    String getClientesData(Long empresaId) {
        List<Usuario> clientes = usuarioRepository.findClientesByEmpresa(empresaId);
        if (clientes.isEmpty()) return "Todavía no hay clientes registrados en este negocio.";

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Tenés %d cliente%s:%n", clientes.size(), clientes.size() == 1 ? "" : "s"));
        clientes.stream().limit(20).forEach(c -> sb.append("  - ")
            .append(c.getNombre() != null && !c.getNombre().isBlank() ? c.getNombre() : "Cliente sin nombre")
            .append("\n"));
        if (clientes.size() > 20) sb.append("  ... y ").append(clientes.size() - 20).append(" más\n");
        return sb.toString();
    }
}
