package com.hotclick.controller;
import com.hotclick.utils.Constants;

import com.hotclick.security.TenantContext;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.ExecutiveDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.Executor;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/executive")
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT','ADMIN_CLIENTE')")
public class ExecutiveController {

    @Autowired private ExecutiveDashboardService executiveService;
    @Autowired private AiCopilotService          aiCopilotService;
    @Autowired private AiQuotaService            aiQuotaService;
    @Autowired @Qualifier("sseExecutor") private Executor sseExecutor;

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        return ResponseEntity.ok(executiveService.getDashboard(TenantContext.get()));
    }

    /** Streams an AI executive summary using the copilot (SSE). */
    @PostMapping(value = "/ai-summary", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter aiSummary() {
        Long empresaId = TenantContext.get();
        String periodo  = LocalDate.now(Constants.ZONA_CR).toString().substring(0, 7);

        if (!aiQuotaService.puedeUsarAi(empresaId)) {
            SseEmitter e = new SseEmitter(0L);
            try { e.send(SseEmitter.event().name("error").data("{\"error\":\"Cuota AI agotada\"}")); e.complete(); }
            catch (Exception ignored) {}
            return e;
        }

        Map<String, Object> data = executiveService.getDashboard(empresaId);
        String prompt = String.format("""
            Genera un resumen ejecutivo conciso del negocio para %s basado en estos datos:
            - MRR: ₡%s
            - Pedidos del mes: %s
            - Delta ingresos vs mes anterior: %s%%
            - Margen bruto: ₡%s
            - AOV (ticket promedio): ₡%s

            Incluye: interpretación de tendencias, 2-3 recomendaciones accionables, y un párrafo de conclusión.
            Máximo 300 palabras. Tono ejecutivo, directo.
            """,
            data.get("periodo"),
            data.get("mrr"), data.get("pedidosMes"),
            data.get("deltaIngresos"), data.get("margenBruto"), data.get("aov")
        );

        SseEmitter emitter = new SseEmitter(120_000L);
        emitter.onCompletion(() -> emitter.complete());
        emitter.onTimeout(() -> emitter.complete());
        sseExecutor.execute(() -> aiCopilotService.chatStream(empresaId, prompt, emitter));
        return emitter;
    }

    /** Saves the AI summary for the given period. */
    @PostMapping("/guardar-resumen")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> guardarResumen(@RequestBody Map<String, String> body) {
        String periodo = body.getOrDefault("periodo", LocalDate.now(Constants.ZONA_CR).toString().substring(0, 7));
        String resumen = body.getOrDefault("resumen", "");
        executiveService.guardarResumenAi(TenantContext.get(), periodo, resumen);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
