package com.hotclick.controller.security;

import com.hotclick.model.IpBloqueada;
import com.hotclick.model.SecurityAlert;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Security Center REST API — ADMIN only.
 *
 * Endpoints:
 *   GET  /api/security/dashboard?period=24h|7d|30d   — KPIs + recent events + alerts
 *   GET  /api/security/events?page&size&type&severity&period — paginated event log
 *   GET  /api/security/alerts?resolved=false          — alert list
 *   PUT  /api/security/alerts/{id}/resolve            — mark alert resolved
 */
@RestController
@RequestMapping("/api/security")
@PreAuthorize("hasRole('ADMIN')")
public class SecurityController {

    @Autowired private SecurityDashboardHandler dashboardHandler;
    @Autowired private SecurityEventsHandler    eventsHandler;
    @Autowired private SecurityAlertsHandler    alertsHandler;
    @Autowired private SecurityUsuariosHandler  usuariosHandler;
    @Autowired private SecurityIpHandler          ipHandler;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam(defaultValue = "24h") String period) {
        return dashboardHandler.getDashboard(period);
    }

    @GetMapping("/events")
    public ResponseEntity<Map<String, Object>> getEvents(
            @RequestParam(defaultValue = "0")    int    page,
            @RequestParam(defaultValue = "20")   int    size,
            @RequestParam(required = false)      String type,
            @RequestParam(required = false)      String severity,
            @RequestParam(defaultValue = "7d")   String period) {
        return eventsHandler.getEvents(page, size, type, severity, period);
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<SecurityAlert>> getAlerts(
            @RequestParam(defaultValue = "false") boolean resolved) {
        return alertsHandler.getAlerts(resolved);
    }

    @PutMapping("/alerts/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolveAlert(@PathVariable Long id) {
        return alertsHandler.resolveAlert(id);
    }

    @GetMapping("/usuarios/lista")
    public ResponseEntity<Map<String, Object>> getUsuariosSeguridadLista(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return usuariosHandler.getUsuariosSeguridadLista(page, size);
    }

    @GetMapping("/usuarios/{email}/eventos")
    public ResponseEntity<Map<String, Object>> getEventosPorUsuario(@PathVariable String email) {
        return usuariosHandler.getEventosPorUsuario(email);
    }

    @GetMapping("/sesiones-activas")
    public ResponseEntity<Map<String, Object>> getSesionesActivas() {
        return ipHandler.getSesionesActivas();
    }

    @GetMapping("/ips-sospechosas")
    public ResponseEntity<List<Map<String, Object>>> getIpsSospechosas(
            @RequestParam(defaultValue = "24h") String period) {
        return ipHandler.getIpsSospechosas(period);
    }

    @GetMapping("/ips-bloqueadas")
    public ResponseEntity<List<IpBloqueada>> getIpsBloqueadas() {
        return ipHandler.getIpsBloqueadas();
    }

    @PostMapping("/ips-bloqueadas")
    public ResponseEntity<Map<String, Object>> bloquearIp(@RequestBody Map<String, String> body) {
        return ipHandler.bloquearIp(body);
    }

    @DeleteMapping("/ips-bloqueadas/{ip}")
    public ResponseEntity<Map<String, Object>> desbloquearIp(@PathVariable String ip) {
        return ipHandler.desbloquearIp(ip);
    }

    @GetMapping("/eventos/export")
    public void exportEventosCsv(
            @RequestParam(defaultValue = "7d") String period,
            HttpServletResponse response) throws IOException {
        eventsHandler.exportEventosCsv(period, response);
    }
}
