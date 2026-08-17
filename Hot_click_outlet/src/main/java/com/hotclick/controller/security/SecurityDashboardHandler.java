package com.hotclick.controller.security;

import com.hotclick.model.SecurityAlert;
import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Dashboard KPIs del Security Center.
 * Extraído bit-idéntico de SecurityController — no cambia comportamiento.
 */
@Component
class SecurityDashboardHandler {

    @Autowired private SecurityAuditLogRepository auditRepo;
    @Autowired private SecurityAlertRepository    alertRepo;
    @Autowired private UsuarioRepository          usuarioRepo;

    ResponseEntity<Map<String, Object>> getDashboard(String period) {
        LocalDateTime from = SecurityControllerHelpers.periodToDateTime(period);

        Map<String, Long> byType = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countByEventTypeAfter(from)) {
            byType.put((String) row[0], (Long) row[1]);
        }

        Map<String, Long> bySeverity = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countBySeverityAfter(from)) {
            bySeverity.put((String) row[0], (Long) row[1]);
        }

        Map<String, Long> failedLoginsByIp = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countByIpForEventTypeAfter("LOGIN_FAILED", from)) {
            if (row[0] != null && row[1] != null) failedLoginsByIp.put((String) row[0], (Long) row[1]);
        }

        long totalEvents    = auditRepo.countByTimestampAfter(from);
        long criticalEvents = auditRepo.countBySeverityAndTimestampAfter("CRITICAL", from);
        long highEvents     = auditRepo.countBySeverityAndTimestampAfter("HIGH", from);
        long failedLogins   = auditRepo.countByEventTypeAndTimestampAfter("LOGIN_FAILED", from);
        long rateLimits     = auditRepo.countByEventTypeAndTimestampAfter("RATE_LIMIT_TRIGGERED", from);
        long tokenRejected  = auditRepo.countByEventTypeAndTimestampAfter("TOKEN_REJECTED", from);
        long activeAlerts   = alertRepo.countByResolvedFalse();
        long criticalAlerts = alertRepo.countBySeverityAndResolvedFalse("CRITICAL");
        long highAlerts     = alertRepo.countBySeverityAndResolvedFalse("HIGH");

        long totalActive    = usuarioRepo.countUsuariosActivos();
        long with2FA        = usuarioRepo.countWith2FAEnabled();
        double adoptionPct  = totalActive > 0 ? Math.round(with2FA * 1000.0 / totalActive) / 10.0 : 0.0;

        List<SecurityAuditLog> recentEvents = auditRepo.findTop50ByOrderByTimestampDesc();
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
}
