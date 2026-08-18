package com.hotclick.service.copilot;

import com.hotclick.service.InventoryForecastService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Consultas de stock e inventario del Copilot admin.
 * Extraído bit-idéntico de AiCopilotDataQueries — no cambia comportamiento.
 */
@Component
class AiCopilotStockQueries {

    private static final int DESCUENTO_SUGERIDO_PCT = 15;

    @Autowired private JdbcTemplate jdbc;
    @Autowired private InventoryForecastService inventoryForecastService;

    /** Productos activos sin ventas en 60+ días — reutiliza el cálculo de InventoryForecastService (F21). */
    String getProductosSinVentaData(Long empresaId) {
        var lentos = inventoryForecastService.productosLentosMovimiento(empresaId);
        if (lentos.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\nProductos sin ventas recientes (60+ días):\n");
        lentos.stream().limit(8).forEach(p -> sb.append(String.format("  - %s: stock %s, última venta hace %s%n",
            p.get("nombre_producto"), p.get("stock_actual"), diasDesde(p.get("fecha_ultima_venta")))));
        return sb.toString();
    }

    String diasDesde(Object fecha) {
        LocalDateTime momento;
        if (fecha instanceof java.sql.Timestamp ts)   momento = ts.toLocalDateTime();
        else if (fecha instanceof LocalDateTime ldt)   momento = ldt;
        else return "nunca registrada";
        return ChronoUnit.DAYS.between(
            momento.atZone(Constants.ZONA_CR),
            ZonedDateTime.now(Constants.ZONA_CR)) + " días";
    }

    String getInventarioData(Long empresaId) {
        String sqlBajo = """
            SELECT nombre_producto, stock_actual, stock_minimo, precio_venta, precio_oferta
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND visible_catalogo = TRUE AND vendido = FALSE
              AND stock_actual <= COALESCE(stock_minimo, 3)
            ORDER BY stock_actual ASC LIMIT 10
            """;
        String sqlTotal = """
            SELECT COUNT(*) as total, SUM(stock_actual) as unidades
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND visible_catalogo = TRUE AND vendido = FALSE
            """;
        var bajo  = jdbc.queryForList(sqlBajo, empresaId);
        var total = jdbc.queryForMap(sqlTotal, empresaId);
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Catálogo activo: %s productos / %s unidades en stock%n",
            total.get("total"), total.get("unidades")));
        if (!bajo.isEmpty()) {
            sb.append("Productos con stock crítico:\n");
            bajo.forEach(p -> sb.append(String.format("  - %s: %s unidades (mínimo: %s) — ₡%s%n",
                p.get("nombre_producto"), p.get("stock_actual"),
                p.get("stock_minimo"), p.get("precio_venta"))));
        } else {
            sb.append("No hay productos con stock crítico.\n");
        }
        return sb.toString();
    }

    List<Map<String, Object>> getProductosSinVentaAccionables(Long empresaId) {
        return inventoryForecastService.productosLentosMovimiento(empresaId).stream()
            .limit(8)
            .map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",             p.get("id_producto"));
                m.put("nombre",         p.get("nombre_producto"));
                m.put("stock",          p.get("stock_actual"));
                m.put("diasSinVenta",   diasDesde(p.get("fecha_ultima_venta")));
                m.put("descuentoSugeridoPct", DESCUENTO_SUGERIDO_PCT);
                return m;
            })
            .toList();
    }

    String getRecomendacionesData(Long empresaId) {
        StringBuilder sb = new StringBuilder();
        var enRiesgo = inventoryForecastService.productosEnRiesgo(empresaId);
        if (!enRiesgo.isEmpty()) {
            sb.append("Productos con stock en riesgo (reabastecer pronto):\n");
            enRiesgo.stream().limit(8).forEach(p -> sb.append(String.format("  - %s: stock %s (mínimo %s)%n",
                p.get("nombre_producto"), p.get("stock_actual"), p.get("stock_minimo"))));
        }
        var lentos = getProductosSinVentaAccionables(empresaId);
        if (!lentos.isEmpty()) {
            sb.append("\nProductos candidatos a descuento (sin ventas en 60+ días):\n");
            lentos.forEach(p -> sb.append(String.format("  - %s: stock %s, sin venta hace %s, descuento sugerido %s%%%n",
                p.get("nombre"), p.get("stock"), p.get("diasSinVenta"), p.get("descuentoSugeridoPct"))));
        }
        if (sb.isEmpty()) {
            sb.append("No hay recomendaciones urgentes en este momento — el negocio está en buen estado.");
        }
        return sb.toString();
    }

    List<Map<String, Object>> getStockCriticoAccionable(Long empresaId) {
        return inventoryForecastService.productosEnRiesgo(empresaId).stream()
            .limit(4)
            .map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", p.get("id_producto"));
                m.put("nombre", p.get("nombre_producto"));
                m.put("stock", p.get("stock_actual"));
                m.put("minimo", p.get("stock_minimo"));
                return m;
            })
            .toList();
    }

    List<Map<String, Object>> getReponerMasAccionable(Long empresaId) {
        return jdbc.queryForList("""
            SELECT p.id_producto, p.nombre_producto, p.stock_actual, p.stock_minimo,
                   SUM(pi.cantidad) AS uds
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
            WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '30 days'
              AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
              AND p.fk_id_estado = 1 AND p.visible_catalogo = TRUE AND p.vendido = FALSE
              AND p.stock_actual <= COALESCE(p.stock_minimo, 5)
            GROUP BY p.id_producto, p.nombre_producto, p.stock_actual, p.stock_minimo
            ORDER BY uds DESC
            LIMIT 4
            """, empresaId).stream()
            .map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", p.get("id_producto"));
                m.put("nombre", p.get("nombre_producto"));
                m.put("stock", p.get("stock_actual"));
                m.put("udsVendidas", p.get("uds"));
                return m;
            })
            .toList();
    }

    Map<String, Object> getInsights(Long empresaId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("lentos", getProductosSinVentaAccionables(empresaId).stream().limit(4).toList());
        m.put("enRiesgo", getStockCriticoAccionable(empresaId));
        m.put("reponerMas", getReponerMasAccionable(empresaId));
        return m;
    }
}
