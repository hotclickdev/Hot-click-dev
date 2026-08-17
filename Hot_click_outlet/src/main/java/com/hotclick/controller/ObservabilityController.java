package com.hotclick.controller;

import com.hotclick.controller.observabilidad.ObservabilityMetricsHandler;
import com.hotclick.dto.ResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * F28 — Observability dashboard endpoint (ADMIN only).
 *
 * GET /api/admin/observabilidad
 *
 * Retorna métricas de plataforma:
 *   - Empresas (activas / trial / vencidas)
 *   - Pedidos (hoy / 7 días)
 *   - Pagos (capturados / pendientes / fallidos)
 *   - Seguridad (eventos críticos últimas 24h / alertas abiertas)
 *   - IA (tokens + llamadas del mes actual)
 *   - BD (tamaño en MB)
 *   - Webhooks con error
 */
@RestController
@RequestMapping("/api/admin/observabilidad")
@PreAuthorize("hasRole('ADMIN')")
public class ObservabilityController {

    @Autowired private ObservabilityMetricsHandler metricsHandler;

    @GetMapping
    public ResponseEntity<ResponseDTO> getMetrics() {
        return metricsHandler.getMetrics();
    }
}
