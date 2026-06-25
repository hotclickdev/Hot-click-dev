package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Pure-Java AI inventory forecasting — no external ML dependencies.
 *
 * Algorithms:
 *   - ABC Analysis: classifies products by % of total revenue (A≤20%, B≤50%, C=rest)
 *   - Simple Moving Average: 30-day daily demand from pedido_item history
 *   - Reorder Point: avg_daily_demand × lead_time + safety_stock (1 week demand)
 *   - Risk detection: stock < ROP
 *   - Slow-mover detection: no sale in 60+ days
 */
@Service
public class InventoryForecastService {

    private static final Logger log = LoggerFactory.getLogger(InventoryForecastService.class);
    private static final int WINDOW_DAYS     = 30;  // moving average window
    private static final int SLOW_MOVER_DAYS = 60;  // no sale = slow mover

    @Autowired private ProductoRepository productoRepository;
    @Autowired private JdbcTemplate       jdbc;

    // ── Public API ────────────────────────────────────────────────────────────

    /** Returns a summary dashboard map for the empresa. */
    public Map<String, Object> dashboard(Long empresaId) {
        List<Map<String, Object>> enRiesgo    = productosEnRiesgo(empresaId);
        List<Map<String, Object>> lentos      = productosLentosMovimiento(empresaId);
        List<Map<String, Object>> abcResumen  = abcResumen(empresaId);
        long totalActivos = countActivos(empresaId);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalActivos",      totalActivos);
        m.put("enRiesgoCount",     enRiesgo.size());
        m.put("lentosCount",       lentos.size());
        m.put("enRiesgo",          enRiesgo);
        m.put("lentos",            lentos);
        m.put("abcResumen",        abcResumen);
        return m;
    }

    /** Products whose current stock is below their reorder point. */
    public List<Map<String, Object>> productosEnRiesgo(Long empresaId) {
        String sql = """
            SELECT p.id_producto, p.nombre_producto, p.stock_actual, p.stock_minimo,
                   p.tiempo_reorden_dias, p.clasificacion_abc, p.demanda_diaria_avg
            FROM hot_click_producto_tb p
            WHERE p.fk_id_empresa = ?
              AND p.fk_id_estado = 1
              AND p.visible_catalogo = TRUE
              AND p.vendido = FALSE
              AND p.stock_actual <= p.stock_minimo
            ORDER BY p.stock_actual ASC
            LIMIT 50
            """;
        return jdbc.queryForList(sql, empresaId).stream()
            .map(this::rowToMap)
            .collect(Collectors.toList());
    }

    /** Products with no sales in the last 60 days. */
    public List<Map<String, Object>> productosLentosMovimiento(Long empresaId) {
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(SLOW_MOVER_DAYS);
        String sql = """
            SELECT p.id_producto, p.nombre_producto, p.stock_actual,
                   p.clasificacion_abc, p.fecha_ultima_venta
            FROM hot_click_producto_tb p
            WHERE p.fk_id_empresa = ?
              AND p.fk_id_estado = 1
              AND p.visible_catalogo = TRUE
              AND p.vendido = FALSE
              AND p.stock_actual > 0
              AND (p.fecha_ultima_venta IS NULL OR p.fecha_ultima_venta < ?)
            ORDER BY p.stock_actual DESC
            LIMIT 50
            """;
        return jdbc.queryForList(sql, empresaId, corte).stream()
            .map(this::rowToMap)
            .collect(Collectors.toList());
    }

    /** Returns count per ABC class for the empresa. */
    public List<Map<String, Object>> abcResumen(Long empresaId) {
        String sql = """
            SELECT COALESCE(clasificacion_abc,'?') AS clase, COUNT(*) AS total
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
            GROUP BY clasificacion_abc
            ORDER BY clasificacion_abc
            """;
        return jdbc.queryForList(sql, empresaId);
    }

    // ── Scheduled update — runs daily via AbcAnalysisScheduler ───────────────

    /**
     * Runs ABC analysis + updates demanda_diaria_avg + fecha_ultima_venta
     * for every active product of the given empresa.
     *
     * A = top products accounting for 70% of revenue
     * B = next 20%
     * C = remaining 10%
     */
    @Transactional
    public void actualizarAnalisisEmpresa(Long empresaId) {
        log.info("[Inventory] Actualizando análisis ABC para empresa={}", empresaId);
        List<Producto> productos = productoRepository.findActivosByEmpresaId(empresaId);
        if (productos.isEmpty()) return;

        // Calculate revenue per product in last 90 days
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusDays(90);
        Map<Long, Double> ingresos = new HashMap<>();
        for (Producto p : productos) {
            double rev = calcularIngreso(p.getId(), desde);
            ingresos.put(p.getId(), rev);
        }

        // Sort by descending revenue
        double totalIngresos = ingresos.values().stream().mapToDouble(Double::doubleValue).sum();
        List<Producto> ordenados = productos.stream()
            .sorted(Comparator.comparingDouble((Producto p) -> ingresos.getOrDefault(p.getId(), 0.0)).reversed())
            .collect(Collectors.toList());

        // Assign ABC class and update demand avg
        double acumulado = 0;
        LocalDateTime window = LocalDateTime.now(Constants.ZONA_CR).minusDays(WINDOW_DAYS);
        for (Producto p : ordenados) {
            acumulado += ingresos.getOrDefault(p.getId(), 0.0);
            String clase = totalIngresos == 0 ? "C"
                : acumulado / totalIngresos <= 0.70 ? "A"
                : acumulado / totalIngresos <= 0.90 ? "B"
                : "C";
            p.setClasificacionAbc(clase);

            // Moving average demand
            double unidades = calcularUnidadesVendidas(p.getId(), window);
            p.setDemandaDiariaAvg(BigDecimal.valueOf(unidades / WINDOW_DAYS).setScale(2, RoundingMode.HALF_UP));

            // Last sale timestamp
            LocalDateTime ultimaVenta = ultimaVenta(p.getId());
            if (ultimaVenta != null) p.setFechaUltimaVenta(ultimaVenta);
        }
        productoRepository.saveAll(ordenados);
        log.info("[Inventory] ABC actualizado: {} productos empresa={}", ordenados.size(), empresaId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private double calcularIngreso(Long productoId, LocalDateTime desde) {
        String sql = """
            SELECT COALESCE(SUM(pi.precio_unitario_momento * pi.cantidad), 0)
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb pe ON pe.id_pedido = pi.fk_id_pedido
            WHERE pi.fk_id_producto = ?
              AND pe.estado_pedido IN ('PAGADO','ENTREGADO')
              AND pe.fecha_pedido >= ?
            """;
        Number result = jdbc.queryForObject(sql, Number.class, productoId, desde);
        return result != null ? result.doubleValue() : 0;
    }

    private double calcularUnidadesVendidas(Long productoId, LocalDateTime desde) {
        String sql = """
            SELECT COALESCE(SUM(pi.cantidad), 0)
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb pe ON pe.id_pedido = pi.fk_id_pedido
            WHERE pi.fk_id_producto = ?
              AND pe.estado_pedido IN ('PAGADO','ENTREGADO')
              AND pe.fecha_pedido >= ?
            """;
        Number result = jdbc.queryForObject(sql, Number.class, productoId, desde);
        return result != null ? result.doubleValue() : 0;
    }

    private LocalDateTime ultimaVenta(Long productoId) {
        String sql = """
            SELECT MAX(pe.fecha_pedido)
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb pe ON pe.id_pedido = pi.fk_id_pedido
            WHERE pi.fk_id_producto = ?
              AND pe.estado_pedido IN ('PAGADO','ENTREGADO')
            """;
        return jdbc.queryForObject(sql, LocalDateTime.class, productoId);
    }

    private long countActivos(Long empresaId) {
        String sql = "SELECT COUNT(*) FROM hot_click_producto_tb WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND visible_catalogo = TRUE";
        Long n = jdbc.queryForObject(sql, Long.class, empresaId);
        return n != null ? n : 0;
    }

    private Map<String, Object> rowToMap(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>(row);
        return m;
    }
}
