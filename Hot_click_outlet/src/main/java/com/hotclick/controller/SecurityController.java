package com.hotclick.controller;

import com.hotclick.model.SecurityAlert;
import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Security Center REST API — ADMIN_IT only.
 *
 * Endpoints:
 *   GET  /api/security/dashboard?period=24h|7d|30d   — KPIs + recent events + alerts
 *   GET  /api/security/events?page&size&type&severity&period — paginated event log
 *   GET  /api/security/alerts?resolved=false          — alert list
 *   PUT  /api/security/alerts/{id}/resolve            — mark alert resolved
 */
@RestController
@RequestMapping("/api/security")
@PreAuthorize("hasRole('ADMIN_IT')")
public class SecurityController {

    private static final Logger log = LoggerFactory.getLogger(SecurityController.class);

    @Autowired private SecurityAuditLogRepository auditRepo;
    @Autowired private SecurityAlertRepository    alertRepo;
    @Autowired private UsuarioRepository          usuarioRepo;

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam(defaultValue = "24h") String period) {

        LocalDateTime from = periodToDateTime(period);

        // Event counts by type
        Map<String, Long> byType = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countByEventTypeAfter(from)) {
            byType.put((String) row[0], (Long) row[1]);
        }

        // Event counts by severity
        Map<String, Long> bySeverity = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countBySeverityAfter(from)) {
            bySeverity.put((String) row[0], (Long) row[1]);
        }

        // Top IPs with failed logins
        Map<String, Long> failedLoginsByIp = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countByIpForEventTypeAfter("LOGIN_FAILED", from)) {
            if (row[0] != null && row[1] != null) failedLoginsByIp.put((String) row[0], (Long) row[1]);
        }

        // Totals
        long totalEvents    = auditRepo.countByTimestampAfter(from);
        long criticalEvents = auditRepo.countBySeverityAndTimestampAfter("CRITICAL", from);
        long highEvents     = auditRepo.countBySeverityAndTimestampAfter("HIGH", from);
        long failedLogins   = auditRepo.countByEventTypeAndTimestampAfter("LOGIN_FAILED", from);
        long rateLimits     = auditRepo.countByEventTypeAndTimestampAfter("RATE_LIMIT_TRIGGERED", from);
        long tokenRejected  = auditRepo.countByEventTypeAndTimestampAfter("TOKEN_REJECTED", from);
        long activeAlerts   = alertRepo.countByResolvedFalse();
        long criticalAlerts = alertRepo.countBySeverityAndResolvedFalse("CRITICAL");
        long highAlerts     = alertRepo.countBySeverityAndResolvedFalse("HIGH");

        // 2FA adoption
        long totalActive    = usuarioRepo.countUsuariosActivos();
        long with2FA        = usuarioRepo.countWith2FAEnabled();
        double adoptionPct  = totalActive > 0 ? Math.round(with2FA * 1000.0 / totalActive) / 10.0 : 0.0;

        // Recent events
        List<SecurityAuditLog> recentEvents = auditRepo.findTop50ByOrderByTimestampDesc();

        // Active alerts (top 10)
        List<SecurityAlert> alerts = alertRepo.findTop10ByResolvedFalseOrderByCreatedAtDesc();

        Map<String, Object> resp = new LinkedHashMap<>();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalEvents",         totalEvents);
        summary.put("criticalEvents",      criticalEvents);
        summary.put("highEvents",          highEvents);
        summary.put("failedLogins",        failedLogins);
        summary.put("rateLimitEvents",     rateLimits);
        summary.put("tokenRejections",     tokenRejected);
        summary.put("activeAlerts",        activeAlerts);
        summary.put("criticalAlerts",      criticalAlerts);
        summary.put("highAlerts",          highAlerts);
        summary.put("period",              period);
        resp.put("summary", summary);

        Map<String, Object> twoFa = new LinkedHashMap<>();
        twoFa.put("total",           totalActive);
        twoFa.put("enabled",         with2FA);
        twoFa.put("adoptionPercent", adoptionPct);
        resp.put("twoFactorAdoption", twoFa);

        resp.put("eventsByType",       byType);
        resp.put("eventsBySeverity",   bySeverity);
        resp.put("failedLoginsByIp",   failedLoginsByIp);
        resp.put("recentEvents",       recentEvents);
        resp.put("activeAlerts",       alerts);

        return ResponseEntity.ok(resp);
    }

    // ── Events log ────────────────────────────────────────────────────────────

    @GetMapping("/events")
    public ResponseEntity<Map<String, Object>> getEvents(
            @RequestParam(defaultValue = "0")    int    page,
            @RequestParam(defaultValue = "20")   int    size,
            @RequestParam(required = false)      String type,
            @RequestParam(required = false)      String severity,
            @RequestParam(defaultValue = "7d")   String period) {

        size = Math.min(size, 100);
        LocalDateTime from = periodToDateTime(period);
        PageRequest pr = PageRequest.of(page, size, Sort.by("timestamp").descending());

        Page<SecurityAuditLog> result;
        if (type != null && severity != null) {
            result = auditRepo.findByEventTypeAndSeverityAndTimestampAfterOrderByTimestampDesc(type, severity, from, pr);
        } else if (type != null) {
            result = auditRepo.findByEventTypeAndTimestampAfterOrderByTimestampDesc(type, from, pr);
        } else if (severity != null) {
            result = auditRepo.findBySeverityAndTimestampAfterOrderByTimestampDesc(severity, from, pr);
        } else {
            result = auditRepo.findByTimestampAfterOrderByTimestampDesc(from, pr);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content",       result.getContent());
        resp.put("totalElements", result.getTotalElements());
        resp.put("totalPages",    result.getTotalPages());
        resp.put("page",          result.getNumber());
        resp.put("size",          result.getSize());

        return ResponseEntity.ok(resp);
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    @GetMapping("/alerts")
    public ResponseEntity<List<SecurityAlert>> getAlerts(
            @RequestParam(defaultValue = "false") boolean resolved) {
        return ResponseEntity.ok(alertRepo.findByResolvedOrderByCreatedAtDesc(resolved));
    }

    @PutMapping("/alerts/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolveAlert(@PathVariable Long id) {
        Optional<SecurityAlert> opt = alertRepo.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SecurityAlert alert = opt.get();
        alert.setResolved(true);
        alert.setResolvedAt(LocalDateTime.now());
        alertRepo.save(alert);
        log.info("[SEC] Alert {} resolved", id);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Alerta resuelta");
        return ResponseEntity.ok(resp);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private LocalDateTime periodToDateTime(String period) {
        return switch (period) {
            case "1h"  -> LocalDateTime.now().minusHours(1);
            case "24h" -> LocalDateTime.now().minusHours(24);
            case "7d"  -> LocalDateTime.now().minusDays(7);
            case "30d" -> LocalDateTime.now().minusDays(30);
            case "90d" -> LocalDateTime.now().minusDays(90);
            default    -> LocalDateTime.now().minusHours(24);
        };
    }
}
