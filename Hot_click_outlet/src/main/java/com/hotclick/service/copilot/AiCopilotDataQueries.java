package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.FinanzasReporteService;
import com.hotclick.service.InventoryForecastService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Consultas SQL de contexto dinámico del Copilot admin.
 * Extraído bit-idéntico de AiCopilotContextBuilder — no cambia comportamiento.
 */
@Component
class AiCopilotDataQueries {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotDataQueries.class);
    private static final int DESCUENTO_SUGERIDO_PCT = 15;

    @Autowired private JdbcTemplate jdbc;
    @Autowired private InventoryForecastService inventoryForecastService;
    @Autowired private FinanzasReporteService finanzasReporteService;
    @Autowired private UsuarioRepository usuarioRepository;

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
        sb.append(getProductosSinVentaData(empresaId));
        sb.append(getClientesPorProductoData(empresaId));
        return sb.toString();
    }

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
            .collect(java.util.stream.Collectors.toList());
    }

    int countPedidosPendientes(Long empresaId) {
        String sql = """
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND estado_pedido IN ('PAGADO','PROCESANDO','PREPARANDO')
            """;
        Integer count = jdbc.queryForObject(sql, Integer.class, empresaId);
        return count != null ? count : 0;
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

    String getFinanzasData(Long empresaId, JsonNode args) {
        String periodo = args != null && args.hasNonNull("periodo") ? args.get("periodo").asText() : "mes";
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        String desde = switch (periodo) {
            case "hoy"    -> hoy.toString();
            case "semana" -> hoy.minusDays(7).toString();
            case "todo"   -> null;
            default       -> hoy.withDayOfMonth(1).toString(); // "mes"
        };

        Map<String, Object> kpis = finanzasReporteService.calcularKpis(empresaId, desde, null);
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        return """
            Período: %s
            Ventas: %s / ₡%s
            Costo de mercadería vendida (CMV): ₡%s
            Costo de envío: ₡%s
            Ganancia neta: ₡%s (margen %s%%)
            IVA recaudado: ₡%s | IVA estimado: ₡%s
            Compras a proveedor recibidas en el período: ₡%s
            """.formatted(periodo, kpis.get("cantidadVentas"), fmt.format(kpis.get("ventasTotales")),
                fmt.format(kpis.get("cmv")), fmt.format(kpis.get("costoEnvio")),
                fmt.format(kpis.get("gananciaNeta")), kpis.get("margenPct"),
                fmt.format(kpis.get("ivaRecaudado")), fmt.format(kpis.get("ivaEstimado")),
                fmt.format(kpis.get("comprasRecibidas")));
    }
}
