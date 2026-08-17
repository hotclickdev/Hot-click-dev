package com.hotclick.service.copilot;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Consultas de catálogo del Copilot admin.
 * Extraído bit-idéntico de AiCopilotDataQueries — no cambia comportamiento.
 */
@Component
class AiCopilotCatalogoQueries {

    @Autowired private JdbcTemplate jdbc;

    String getCatalogoData(Long empresaId) {
        String sql = """
            SELECT nombre_producto, descripcion_corta, precio_venta, precio_oferta,
                   stock_actual, tags
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
              AND visible_catalogo = TRUE AND vendido = FALSE AND stock_actual > 0
            ORDER BY id_producto DESC LIMIT 20
            """;
        var prods = jdbc.queryForList(sql, empresaId);
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Catálogo disponible (%d productos):%n", prods.size()));
        prods.forEach(p -> {
            String oferta = p.get("precio_oferta") != null ? " (oferta: ₡" + p.get("precio_oferta") + ")" : "";
            sb.append(String.format("  - %s — ₡%s%s | Stock: %s%n",
                p.get("nombre_producto"), p.get("precio_venta"), oferta, p.get("stock_actual")));
            if (p.get("descripcion_corta") != null && !p.get("descripcion_corta").toString().isBlank()) {
                sb.append(String.format("    Desc: %s%n", p.get("descripcion_corta")));
            }
        });
        return sb.toString();
    }
}
