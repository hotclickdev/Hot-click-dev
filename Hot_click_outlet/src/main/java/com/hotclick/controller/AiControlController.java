package com.hotclick.controller;

import com.hotclick.service.FeatureFlagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * ADMIN_IT only — AI control panel.
 *
 * GET  /api/security/ai/dashboard  — usage per empresa + flag state + alerts
 */
@RestController
@RequestMapping("/api/security/ai")
@PreAuthorize("hasRole('ADMIN_IT')")
public class AiControlController {

    @Autowired private JdbcTemplate       jdbc;
    @Autowired private FeatureFlagService flagService;

    private static final double PRECIO_INPUT_POR_TOKEN  = 0.0000008;  // $0.80 / M
    private static final double PRECIO_OUTPUT_POR_TOKEN = 0.000004;   // $4.00 / M

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {
        int targetAnio = (anio != null) ? anio : java.time.LocalDate.now().getYear();
        int targetMes  = (mes  != null) ? mes  : java.time.LocalDate.now().getMonthValue();

        String sql = """
            SELECT
              e.id_empresa,
              e.nombre_empresa,
              COALESCE(e.nombre_comercial, e.nombre_empresa) AS nombre_comercial,
              e.plan_saas,
              COALESCE(u.llamadas,       0) AS llamadas,
              COALESCE(u.tokens_entrada, 0) AS tokens_entrada,
              COALESCE(u.tokens_salida,  0) AS tokens_salida
            FROM hot_click_empresa_tb e
            LEFT JOIN hot_click_ai_uso_tb u
                   ON u.fk_id_empresa = e.id_empresa
                  AND u.anio = ?
                  AND u.mes  = ?
            WHERE e.estado_empresa = 'ACTIVO'
            ORDER BY COALESCE(u.llamadas, 0) DESC, e.nombre_empresa
            """;

        List<Map<String, Object>> rows = jdbc.queryForList(sql, targetAnio, targetMes);

        // Plan limits (same as AiQuotaService)
        Map<String, Integer> limites = Map.of("GRATUITO", 0, "PRO", 50, "ENTERPRISE", 500);

        List<Map<String, Object>> empresas   = new ArrayList<>();
        List<Map<String, Object>> alertas    = new ArrayList<>();
        double costoTotalUsd = 0;
        int totalLlamadas    = 0;

        for (Map<String, Object> row : rows) {
            Long   id       = ((Number) row.get("id_empresa")).longValue();
            String plan     = (String) row.get("plan_saas");
            int    llamadas = ((Number) row.get("llamadas")).intValue();
            int    te       = ((Number) row.get("tokens_entrada")).intValue();
            int    ts       = ((Number) row.get("tokens_salida")).intValue();
            int    limite   = limites.getOrDefault(plan != null ? plan.toUpperCase() : "GRATUITO", 0);

            double costoUsd = te * PRECIO_INPUT_POR_TOKEN + ts * PRECIO_OUTPUT_POR_TOKEN;
            costoTotalUsd  += costoUsd;
            totalLlamadas  += llamadas;

            // Flag states for this empresa
            boolean chatActivo    = flagService.isEnabled("chat_publico",        id);
            boolean copilotActivo = flagService.isEnabled("copilot_emprendedor", id);
            boolean aiCopilot     = flagService.isEnabled("ai_copilot",          id);

            int pct = (limite > 0) ? Math.min(100, llamadas * 100 / limite) : 0;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",            id);
            m.put("nombre",        row.get("nombre_comercial"));
            m.put("plan",          plan);
            m.put("llamadas",      llamadas);
            m.put("limite",        limite);
            m.put("pct",           pct);
            m.put("tokensEntrada", te);
            m.put("tokensSalida",  ts);
            m.put("costoUsd",      Math.round(costoUsd * 10000.0) / 10000.0);
            m.put("chatActivo",    chatActivo);
            m.put("copilotActivo", copilotActivo || aiCopilot);
            empresas.add(m);

            // Auto-detect alerts
            if (limite > 0 && pct >= 80 && pct < 100) {
                alertas.add(alert("ADVERTENCIA", id, row.get("nombre_comercial").toString(),
                    "Cerca del límite: " + llamadas + "/" + limite + " llamadas (" + pct + "%)"));
            } else if (limite > 0 && llamadas >= limite) {
                alertas.add(alert("LIMITE", id, row.get("nombre_comercial").toString(),
                    "Cuota agotada: " + llamadas + "/" + limite + " llamadas"));
            }
            if (limite > 0 && llamadas == 0) {
                alertas.add(alert("INFO", id, row.get("nombre_comercial").toString(),
                    "Plan " + plan + " activo pero sin uso de AI este mes"));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("empresas",     empresas);
        result.put("alertas",      alertas);
        result.put("costoTotal",   Math.round(costoTotalUsd * 10000.0) / 10000.0);
        result.put("totalLlamadas", totalLlamadas);
        result.put("mes",          java.time.LocalDate.now().toString().substring(0, 7));
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> alert(String tipo, Long empresaId, String nombre, String mensaje) {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("tipo",      tipo);
        a.put("empresaId", empresaId);
        a.put("nombre",    nombre);
        a.put("mensaje",   mensaje);
        return a;
    }
}
