package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Centralized security event logging.
 * Every event is:
 *   1. Written to SLF4J immediately (zero DB latency).
 *   2. Persisted to hot_click_security_audit_log_tb for audit queries.
 *
 * Uses Propagation.REQUIRES_NEW so audit records commit independently
 * of any outer transaction (e.g. a failed login that rolls back).
 * With a 3-connection pool this is safe because the outer transaction
 * is always released before the filter calls this service.
 */
@Service
public class SecurityAuditService {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditService.class);

    private final SecurityAuditLogRepository auditRepo;
    private final ObjectMapper               objectMapper;
    private final GeoIpService               geoIpService;

    public SecurityAuditService(SecurityAuditLogRepository auditRepo,
                                ObjectMapper objectMapper,
                                GeoIpService geoIpService) {
        this.auditRepo     = auditRepo;
        this.objectMapper  = objectMapper;
        this.geoIpService  = geoIpService;
    }

    // ── Main log entry point ──────────────────────────────────────────────────

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(SecurityEventType type,
                    SecurityEventSeverity severity,
                    Long userId,
                    String email,
                    String ip,
                    String userAgent,
                    String endpoint,
                    Map<String, Object> metadata) {

        String sev = severity.name();
        String evt = type.name();
        String meta = toJson(metadata);

        // Structured log — always committed even if DB save fails
        log.info("[SEC] type={} severity={} userId={} email={} ip={} endpoint={} meta={}",
            evt, sev, userId, email, ip, endpoint, meta);

        try {
            SecurityAuditLog record = new SecurityAuditLog();
            record.setTimestamp(LocalDateTime.now(Constants.ZONA_CR));
            record.setEventType(evt);
            record.setSeverity(sev);
            record.setUserId(userId);
            record.setEmail(sanitizeEmail(email));
            record.setIpAddress(ip);
            record.setUserAgent(truncate(userAgent, 300));
            record.setEndpoint(truncate(endpoint, 200));
            record.setMetadata(meta);
            auditRepo.save(record);
        } catch (Exception e) {
            log.error("[SEC] Failed to persist audit log record type={}: {}", evt, e.getMessage());
        }
    }

    // ── Convenience methods ───────────────────────────────────────────────────

    public void logLoginSuccess(Long userId, String email, HttpServletRequest request) {
        String ip = getIp(request);
        log(SecurityEventType.LOGIN_SUCCESS, SecurityEventSeverity.LOW,
            userId, email, ip, getUa(request), "/api/auth/login", null);
        geoIpService.checkAsync(ip, userId, email);
    }

    public void logLoginFailed(String email, HttpServletRequest request, String reason) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("reason", reason);
        log(SecurityEventType.LOGIN_FAILED, SecurityEventSeverity.MEDIUM,
            null, email, getIp(request), getUa(request), "/api/auth/login", meta);
    }

    public void logLoginBlocked(String email, HttpServletRequest request) {
        log(SecurityEventType.LOGIN_BLOCKED, SecurityEventSeverity.HIGH,
            null, email, getIp(request), getUa(request), "/api/auth/login", null);
    }

    public void logLogout(Long userId, String email, HttpServletRequest request) {
        log(SecurityEventType.LOGOUT, SecurityEventSeverity.LOW,
            userId, email, getIp(request), getUa(request), "/api/auth/logout", null);
    }

    public void log2FAFailed(Long userId, String email, HttpServletRequest request, String method) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("method", method);
        log(SecurityEventType.TWO_FA_FAILED, SecurityEventSeverity.MEDIUM,
            userId, email, getIp(request), getUa(request), "/api/auth/2fa/verify", meta);
    }

    public void log2FASuccess(Long userId, String email, HttpServletRequest request, String method) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("method", method);
        log(SecurityEventType.LOGIN_SUCCESS, SecurityEventSeverity.LOW,
            userId, email, getIp(request), getUa(request), "/api/auth/2fa/verify", meta);
    }

    public void logOtpSent(Long userId, String email, String endpoint) {
        log(SecurityEventType.OTP_SENT, SecurityEventSeverity.LOW,
            userId, email, null, null, endpoint, null);
    }

    public void logTokenRejected(String ip, String userAgent, String endpoint, String reason) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("reason", reason);
        log(SecurityEventType.TOKEN_REJECTED, SecurityEventSeverity.MEDIUM,
            null, null, ip, userAgent, endpoint, meta);
    }

    public void logTokenExpired(String ip, String userAgent, String endpoint) {
        log(SecurityEventType.TOKEN_EXPIRED, SecurityEventSeverity.LOW,
            null, null, ip, userAgent, endpoint, null);
    }

    public void logRateLimitTriggered(String ip, String endpoint) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("path", endpoint);
        log(SecurityEventType.RATE_LIMIT_TRIGGERED, SecurityEventSeverity.MEDIUM,
            null, null, ip, null, endpoint, meta);
    }

    public void logPermissionDenied(Long userId, String email, String ip, String endpoint) {
        log(SecurityEventType.PERMISSION_DENIED, SecurityEventSeverity.MEDIUM,
            userId, email, ip, null, endpoint, null);
    }

    public void logPasswordResetRequest(String email, HttpServletRequest request) {
        log(SecurityEventType.PASSWORD_RESET_REQUEST, SecurityEventSeverity.LOW,
            null, email, getIp(request), getUa(request), "/api/auth/forgot-password", null);
    }

    public void logPasswordResetSuccess(Long userId, String email, HttpServletRequest request) {
        log(SecurityEventType.PASSWORD_RESET_SUCCESS, SecurityEventSeverity.LOW,
            userId, email, getIp(request), getUa(request), "/api/auth/reset-password", null);
    }

    public void logPasswordChanged(Long userId, String email, HttpServletRequest request) {
        log(SecurityEventType.PASSWORD_CHANGED, SecurityEventSeverity.LOW,
            userId, email, getIp(request), getUa(request), "/api/auth/change-password", null);
    }

    public void logDetection(SecurityEventType detectionType, SecurityEventSeverity severity,
                             String ip, Long userId, String description) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("description", description);
        log(detectionType, severity, userId, null, ip, null, "DETECTION", meta);
    }

    public void logRegistration(Long userId, String email, HttpServletRequest request) {
        log(SecurityEventType.REGISTRATION_SUCCESS, SecurityEventSeverity.LOW,
            userId, email, getIp(request), getUa(request), "/api/auth/registro-empresa", null);
    }

    public void logAdminAction(Long adminId, String adminEmail, String action, String entity, Long entityId) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("action", action);
        meta.put("entity", entity);
        meta.put("entityId", entityId);
        log(SecurityEventType.ADMIN_ACTION, SecurityEventSeverity.LOW,
            adminId, adminEmail, null, null, "/api/admin", meta);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public String getIp(HttpServletRequest request) {
        if (request == null) return null;
        return request.getRemoteAddr();
    }

    public String getUa(HttpServletRequest request) {
        if (request == null) return null;
        return truncate(request.getHeader("User-Agent"), 300);
    }

    private String sanitizeEmail(String email) {
        if (email == null) return null;
        return truncate(email.toLowerCase().trim(), 150);
    }

    private String truncate(String value, int maxLen) {
        if (value == null) return null;
        return value.length() > maxLen ? value.substring(0, maxLen) : value;
    }

    private String toJson(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException e) {
            return metadata.toString();
        }
    }
}
