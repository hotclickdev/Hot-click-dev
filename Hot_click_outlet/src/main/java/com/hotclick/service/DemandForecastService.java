package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Forecast;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ForecastRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Demand forecasting using Holt-Winters double exponential smoothing.
 *
 * Uses weekly sales data (last 16 weeks) to forecast the next 4 weeks.
 * Confidence score = 100 - (MAPE * 2), clamped to [0, 95].
 *
 * Parameters:
 *   α = 0.3  (level — how much weight to give recent obs)
 *   β = 0.15 (trend — how strongly to project the trend)
 *
 * Formula:
 *   L_t = α * y_t + (1-α) * (L_{t-1} + T_{t-1})
 *   T_t = β * (L_t - L_{t-1}) + (1-β) * T_{t-1}
 *   F_{t+h} = L_t + h * T_t
 */
@Service
public class DemandForecastService {

    private static final Logger log  = LoggerFactory.getLogger(DemandForecastService.class);
    private static final double ALPHA = 0.3;
    private static final double BETA  = 0.15;
    private static final int HISTORY_WEEKS  = 16;
    private static final int FORECAST_WEEKS = 4;

    @Autowired private ForecastRepository forecastRepository;
    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired private JdbcTemplate       jdbc;

    // ── Public API ────────────────────────────────────────────────────────────

    /** Returns company-level forecast + recent history for the dashboard. */
    public Map<String, Object> getForecastDashboard(Long empresaId) {
        List<Forecast> forecasts = forecastRepository
            .findByEmpresaIdAndProductoIdIsNullAndTipoOrderByPeriodoAsc(empresaId, "SEMANAL");

        List<Map<String, Object>> history  = getHistorySemanal(empresaId, HISTORY_WEEKS);
        List<Map<String, Object>> fList    = forecasts.stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("periodo",   f.getPeriodo());
            m.put("unidades",  f.getUnidadesForecast());
            m.put("ingresos",  f.getIngresosForecast());
            m.put("confianza", f.getConfianza());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("historial",  history);
        result.put("pronostico", fList);
        result.put("generado",   forecasts.isEmpty() ? null :
            forecasts.get(0).getFechaGeneracion() != null ? forecasts.get(0).getFechaGeneracion().toString() : null);
        return result;
    }

    /** Triggers immediate forecast calculation for the empresa. */
    @Transactional
    public void generarForecast(Long empresaId) {
        log.info("[Forecast] Generando pronóstico empresa={}", empresaId);
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) return;

        // Get weekly history
        List<double[]> weeklyData = getWeeklySalesData(empresaId, HISTORY_WEEKS);
        if (weeklyData.size() < 4) {
            log.warn("[Forecast] Datos insuficientes para empresa={} (semanas={})", empresaId, weeklyData.size());
            return;
        }

        double[] units   = weeklyData.stream().mapToDouble(d -> d[0]).toArray();
        double[] revenue = weeklyData.stream().mapToDouble(d -> d[1]).toArray();

        // Run Holt-Winters double exponential smoothing
        double[] unitsForecast   = holtWinters(units, FORECAST_WEEKS);
        double[] revenueForecast = holtWinters(revenue, FORECAST_WEEKS);

        // Confidence: based on MAPE of in-sample fit
        double confianza = calcularConfianza(units, unitsForecast);

        // Delete old empresa-level forecasts
        forecastRepository.deleteEmpresaLevelForecasts(empresaId);

        // Save new forecasts
        LocalDate now = LocalDate.now();
        for (int h = 1; h <= FORECAST_WEEKS; h++) {
            LocalDate weekStart = now.plusWeeks(h);
            String periodo = yearWeek(weekStart);

            Forecast f = new Forecast();
            f.setEmpresa(empresa);
            f.setPeriodo(periodo);
            f.setTipo("SEMANAL");
            f.setUnidadesForecast(Math.max(0, (int) Math.round(unitsForecast[h - 1])));
            f.setIngresosForecast(Math.max(0, (int) Math.round(revenueForecast[h - 1])));
            f.setConfianza(BigDecimal.valueOf(confianza).setScale(1, RoundingMode.HALF_UP));
            forecastRepository.save(f);
        }
        log.info("[Forecast] {} semanas generadas para empresa={}", FORECAST_WEEKS, empresaId);
    }

    // ── Holt-Winters double exponential smoothing ────────────────────────────

    /**
     * Returns {@code h} forecast values using Holt-Winters double smoothing.
     * Handles empty/zero series gracefully.
     */
    static double[] holtWinters(double[] y, int h) {
        int n = y.length;
        if (n == 0) return new double[h];

        // Initialise level and trend
        double L = y[0];
        double T = n > 1 ? (y[n - 1] - y[0]) / (n - 1) : 0;

        for (int t = 1; t < n; t++) {
            double L_prev = L;
            L = ALPHA * y[t] + (1 - ALPHA) * (L + T);
            T = BETA  * (L - L_prev) + (1 - BETA) * T;
        }

        double[] forecast = new double[h];
        for (int i = 0; i < h; i++) {
            forecast[i] = Math.max(0, L + (i + 1) * T);
        }
        return forecast;
    }

    /** MAPE-based confidence: 100 - min(MAPE*2, 95), clamped [5,95]. */
    private double calcularConfianza(double[] actual, double[] forecast) {
        if (actual.length == 0) return 50;
        int minLen = Math.min(actual.length, forecast.length);
        double sumErr = 0;
        int count = 0;
        for (int i = 0; i < minLen; i++) {
            if (actual[i] > 0) {
                sumErr += Math.abs(actual[i] - forecast[i]) / actual[i];
                count++;
            }
        }
        double mape = count > 0 ? (sumErr / count) * 100 : 50;
        return Math.max(5, Math.min(95, 100 - mape * 2));
    }

    // ── Data helpers ─────────────────────────────────────────────────────────

    /** Returns [[units, revenue], ...] ordered oldest→newest for N weeks. */
    private List<double[]> getWeeklySalesData(Long empresaId, int weeks) {
        String sql = """
            SELECT
              TO_CHAR(DATE_TRUNC('week', pe.fecha_pedido), 'IYYY-IW') AS semana,
              COALESCE(SUM(pi.cantidad), 0)                            AS unidades,
              COALESCE(SUM(pi.precio_unitario_momento * pi.cantidad), 0) AS ingresos
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb pe ON pe.id_pedido = pi.fk_id_pedido
            WHERE pe.fk_id_empresa = ?
              AND pe.estado_pedido IN ('PAGADO','ENTREGADO')
              AND pe.fecha_pedido >= NOW() - INTERVAL '%d weeks'
            GROUP BY semana
            ORDER BY semana ASC
            """.formatted(weeks);
        return jdbc.queryForList(sql, empresaId)
            .stream()
            .map(row -> new double[]{
                ((Number) row.get("unidades")).doubleValue(),
                ((Number) row.get("ingresos")).doubleValue()
            })
            .collect(Collectors.toList());
    }

    private List<Map<String, Object>> getHistorySemanal(Long empresaId, int weeks) {
        String sql = """
            SELECT
              TO_CHAR(DATE_TRUNC('week', pe.fecha_pedido), 'IYYY-IW') AS periodo,
              COALESCE(SUM(pi.cantidad), 0)                            AS unidades,
              COALESCE(SUM(pi.precio_unitario_momento * pi.cantidad), 0) AS ingresos
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb pe ON pe.id_pedido = pi.fk_id_pedido
            WHERE pe.fk_id_empresa = ?
              AND pe.estado_pedido IN ('PAGADO','ENTREGADO')
              AND pe.fecha_pedido >= NOW() - INTERVAL '%d weeks'
            GROUP BY periodo
            ORDER BY periodo ASC
            """.formatted(weeks);
        return jdbc.queryForList(sql, empresaId);
    }

    private String yearWeek(LocalDate date) {
        WeekFields wf = WeekFields.ISO;
        int year = date.get(wf.weekBasedYear());
        int week = date.get(wf.weekOfWeekBasedYear());
        return String.format("%04d-%02d", year, week);
    }
}
