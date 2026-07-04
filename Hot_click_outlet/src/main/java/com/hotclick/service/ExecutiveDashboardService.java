package com.hotclick.service;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.utils.Constants;

import com.hotclick.model.Empresa;
import com.hotclick.model.Reporte;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ReporteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregates executive-level KPIs for the BI dashboard.
 *
 * Metrics returned:
 *   - MRR (current month recurring revenue)
 *   - ARR projection (MRR × 12)
 *   - Orders this month vs last month (% change)
 *   - Revenue this month vs last month
 *   - Gross margin %
 *   - Top 5 categories by revenue
 *   - Monthly revenue trend (last 12 months)
 *   - Average order value (AOV)
 */
@Service
public class ExecutiveDashboardService {

    @Autowired private JdbcTemplate      jdbc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ReporteRepository reporteRepository;

    public Map<String, Object> getDashboard(Long empresaId) {
        LocalDate hoy   = LocalDate.now(Constants.ZONA_CR);
        LocalDate mes1  = hoy.withDayOfMonth(1);
        LocalDate mes0  = mes1.minusMonths(1);

        Map<String, Object> mesActual  = getMetricsMes(empresaId, mes1, hoy);
        Map<String, Object> mesAnter   = getMetricsMes(empresaId, mes0, mes1.minusDays(1));
        List<Map<String, Object>> tendencia   = getTendencia12Meses(empresaId);
        List<Map<String, Object>> topCats     = getTopCategorias(empresaId, mes1.minusMonths(3), hoy);
        List<Map<String, Object>> histReportes = getHistorialReportes(empresaId);

        // Compute % deltas
        long revActual = num(mesActual, "ingresos");
        long revAnter  = num(mesAnter,  "ingresos");
        long ordActual = num(mesActual, "pedidos");
        long ordAnter  = num(mesAnter,  "pedidos");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mrr",              revActual);
        result.put("arr",              revActual * 12);
        result.put("pedidosMes",       ordActual);
        result.put("ingresosMes",      revActual);
        result.put("deltaIngresos",    pct(revActual, revAnter));
        result.put("deltaPedidos",     pct(ordActual, ordAnter));
        result.put("margenBruto",      num(mesActual, "margen"));
        result.put("aov",              ordActual > 0 ? revActual / ordActual : 0);
        result.put("tendencia",        tendencia);
        result.put("topCategorias",    topCats);
        result.put("historialReportes", histReportes);
        result.put("empresa",          getEmpresaInfo(empresaId));
        result.put("periodo",          mes1.format(DateTimeFormatter.ofPattern("MMMM yyyy", new Locale("es"))));
        return result;
    }

    @Transactional
    public Reporte guardarResumenAi(Long empresaId, String periodo, String resumen) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        Reporte r = reporteRepository.findByEmpresaIdAndTipoAndPeriodo(empresaId, "EJECUTIVO_MENSUAL", periodo)
            .orElseGet(() -> { Reporte nr = new Reporte(); nr.setEmpresa(empresa); nr.setTipo("EJECUTIVO_MENSUAL"); nr.setPeriodo(periodo); return nr; });
        r.setResumenAi(resumen);
        return reporteRepository.save(r);
    }

    // ── SQL helpers ───────────────────────────────────────────────────────────

    private Map<String, Object> getMetricsMes(Long empresaId, LocalDate desde, LocalDate hasta) {
        String sql = """
            SELECT
              COUNT(*)                                            AS pedidos,
              COALESCE(SUM(total_pedido), 0)                     AS ingresos,
              COALESCE(SUM(utilidad_bruta), 0)                   AS margen
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ?
              AND estado_pedido IN ('PAGADO','ENTREGADO')
              AND fecha_pedido BETWEEN ? AND ?
            """;
        return jdbc.queryForMap(sql, empresaId, desde.atStartOfDay(), hasta.atTime(23, 59, 59));
    }

    private List<Map<String, Object>> getTendencia12Meses(Long empresaId) {
        String sql = """
            SELECT
              TO_CHAR(DATE_TRUNC('month', fecha_pedido), 'YYYY-MM') AS mes,
              COUNT(*)                                               AS pedidos,
              COALESCE(SUM(total_pedido), 0)                        AS ingresos,
              COALESCE(SUM(utilidad_bruta), 0)                      AS margen
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ?
              AND estado_pedido IN ('PAGADO','ENTREGADO')
              AND fecha_pedido >= NOW() - INTERVAL '12 months'
            GROUP BY mes
            ORDER BY mes ASC
            """;
        return jdbc.queryForList(sql, empresaId);
    }

    private List<Map<String, Object>> getTopCategorias(Long empresaId, LocalDate desde, LocalDate hasta) {
        String sql = """
            SELECT
              COALESCE(c.nombre_categoria, 'Sin categoría') AS categoria,
              SUM(pi.precio_unitario_momento * pi.cantidad)  AS ingresos,
              SUM(pi.cantidad)                               AS unidades
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb pe ON pe.id_pedido = pi.fk_id_pedido
            JOIN hot_click_producto_tb pr ON pr.id_producto = pi.fk_id_producto
            LEFT JOIN hot_click_categoria_tb c ON c.id_categoria = pr.fk_id_categoria
            WHERE pe.fk_id_empresa = ?
              AND pe.estado_pedido IN ('PAGADO','ENTREGADO')
              AND pe.fecha_pedido BETWEEN ? AND ?
            GROUP BY categoria
            ORDER BY ingresos DESC
            LIMIT 5
            """;
        return jdbc.queryForList(sql, empresaId, desde.atStartOfDay(), hasta.atTime(23, 59, 59));
    }

    private List<Map<String, Object>> getHistorialReportes(Long empresaId) {
        return reporteRepository.findByEmpresaIdAndTipoOrderByPeriodoDesc(empresaId, "EJECUTIVO_MENSUAL")
            .stream().limit(6).map(r -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",       r.getId());
                m.put("periodo",  r.getPeriodo());
                m.put("tieneAi",  r.getResumenAi() != null && !r.getResumenAi().isBlank());
                m.put("fecha",    r.getFechaGeneracion() != null ? r.getFechaGeneracion().toString() : "");
                return m;
            }).collect(Collectors.toList());
    }

    private Map<String, Object> getEmpresaInfo(Long empresaId) {
        return empresaRepository.findById(empresaId).map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("nombre",  e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa());
            m.put("logo",    e.getLogoUrl());
            m.put("plan",    e.getPlan() != null ? e.getPlan().getNombre() : e.getPlanSaas());
            return m;
        }).orElse(Map.of());
    }

    private long num(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v instanceof Number n ? n.longValue() : 0;
    }

    private double pct(long actual, long anterior) {
        if (anterior == 0) return actual > 0 ? 100 : 0;
        return Math.round(((double)(actual - anterior) / anterior) * 1000) / 10.0;
    }
}
