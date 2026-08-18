package com.hotclick.service.copilot;

import com.hotclick.service.catalogo.CatalogoChatSql;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.text.DecimalFormat;
import java.util.List;
import java.util.Map;

/**
 * Compara precios propios contra el catálogo público. Sin stock ni ventas de otros tenants.
 */
@Component
class AiCopilotMercadoQueries {

    @Autowired private JdbcTemplate jdbc;

    String compararCatalogoPublico(Long empresaId) {
        List<Map<String, Object>> propios = jdbc.queryForList("""
            SELECT p.nombre_producto, COALESCE(NULLIF(p.precio_oferta, 0), p.precio_venta) AS precio,
                   c.nombre_categoria
            FROM hot_click_producto_tb p
            LEFT JOIN hot_click_categoria_tb c ON p.fk_id_categoria = c.id_categoria
            WHERE p.fk_id_empresa = ? AND p.fk_id_estado = 1
              AND p.visible_catalogo = TRUE AND p.vendido = FALSE
            ORDER BY p.stock_actual DESC
            LIMIT 6
            """, empresaId);
        if (propios.isEmpty()) return "No hay productos propios para comparar.";
        DecimalFormat fmt = new DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder("Vs catálogo público (solo precios, no stock ajeno):\n");
        propios.forEach(p -> sb.append(linea(empresaId, p, fmt)));
        return sb.toString();
    }

    private String linea(Long empresaId, Map<String, Object> propio, DecimalFormat fmt) {
        long miPrecio = ((Number) propio.get("precio")).longValue();
        String nombre = String.valueOf(propio.get("nombre_producto"));
        String cat = propio.get("nombre_categoria") == null ? "" : String.valueOf(propio.get("nombre_categoria"));
        String tipico = fraseVsTipico(percentilPrecio(miPrecio, preciosPublicosCategoria(empresaId, cat)), cat);
        var pares = buscarSimilares(empresaId, nombre);
        if (pares.isEmpty()) {
            return String.format("  - %s (₡%s): %s%n", nombre, fmt.format(miPrecio), tipico);
        }
        Map<String, Object> otro = pares.get(0);
        long precioPub = ((Number) otro.get("precio")).longValue();
        String vs = miPrecio > precioPub ? "más caro" : miPrecio < precioPub ? "más barato" : "al mismo precio";
        return String.format("  - %s ₡%s vs público \"%s\" ₡%s → estás %s. %s%n",
            nombre, fmt.format(miPrecio), otro.get("nombre_producto"), fmt.format(precioPub), vs, tipico);
    }

    static int percentilPrecio(long miPrecio, List<Long> preciosPublicos) {
        if (preciosPublicos == null || preciosPublicos.isEmpty()) return -1;
        long menores = preciosPublicos.stream().filter(p -> p < miPrecio).count();
        return (int) Math.round(100.0 * menores / preciosPublicos.size());
    }

    static String fraseVsTipico(int percentil, String categoria) {
        String cat = (categoria == null || categoria.isBlank()) ? "la categoría" : categoria;
        if (percentil < 0) return "No hay suficientes precios públicos en " + cat + " para el típico.";
        if (percentil >= 60) return "Estás más caro que el típico de " + cat + ".";
        if (percentil <= 40) return "Estás más barato que el típico de " + cat + ".";
        return "Estás cerca del típico de " + cat + ".";
    }

    private List<Long> preciosPublicosCategoria(Long empresaId, String categoria) {
        if (categoria == null || categoria.isBlank()) return List.of();
        String sql = "SELECT COALESCE(NULLIF(p.precio_oferta, 0), p.precio_venta) AS precio "
            + "FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(true)
            + " WHERE " + CatalogoChatSql.whereVisible(true, false)
            + " AND (p.fk_id_empresa IS NULL OR p.fk_id_empresa <> ?) "
            + " AND c.nombre_categoria = ? LIMIT 80";
        return jdbc.queryForList(sql, empresaId, categoria).stream()
            .map(r -> ((Number) r.get("precio")).longValue())
            .toList();
    }

    private List<Map<String, Object>> buscarSimilares(Long empresaId, String nombre) {
        String token = tokenBusqueda(nombre);
        String sql = "SELECT p.nombre_producto, COALESCE(NULLIF(p.precio_oferta, 0), p.precio_venta) AS precio "
            + "FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(true)
            + " WHERE " + CatalogoChatSql.whereVisible(true, false)
            + " AND (p.fk_id_empresa IS NULL OR p.fk_id_empresa <> ?) "
            + " AND p.nombre_producto ILIKE ? LIMIT 2";
        return jdbc.queryForList(sql, empresaId, "%" + token + "%");
    }

    static String tokenBusqueda(String nombre) {
        if (nombre == null || nombre.isBlank()) return "producto";
        String[] parts = nombre.trim().split("\\s+");
        for (String p : parts) {
            if (p.length() >= 4) return p.replace("%", "").replace("_", "");
        }
        return parts[0].replace("%", "");
    }
}
