package com.hotclick.service;

import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import com.hotclick.service.security.SecurityAlertNotifier;
import com.hotclick.service.security.SecurityRateWindowTracker;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Queue;
import java.util.Set;

/**
 * In-memory attack pattern detection.
 *
 * Detects:
 *  - Brute force: 5+ failed logins from same IP in 10 min → HIGH
 *  - Password spray: 3+ different target accounts from same IP in 5 min → HIGH
 *  - Credential stuffing: 15+ failed logins from same IP in 1 hour → CRITICAL
 *  - JWT scanning: 15+ invalid tokens from same IP in 5 min → MEDIUM
 *  - OTP flood: 5+ OTP requests for same user in 10 min → MEDIUM
 *
 * All state is in-memory (resets on restart). Alerts are persisted to DB.
 * Alert deduplication: max one alert per (type, ip/user) per 5 minutes.
 */
@Service
public class SecurityDetectionService {
    private final SecurityAuditService auditService;
    private final SecurityRateWindowTracker tracker;
    private final SecurityAlertNotifier alertNotifier;

    // ── Thresholds ────────────────────────────────────────────────────────────
    private static final int  BRUTE_FORCE_THRESHOLD    = 5;
    private static final long BRUTE_FORCE_WINDOW_MS    = 600_000L;  // 10 min

    private static final int  SPRAY_THRESHOLD          = 3;         // distinct targets
    private static final long SPRAY_WINDOW_MS          = 300_000L;  // 5 min

    private static final int  STUFFING_THRESHOLD       = 15;
    private static final long STUFFING_WINDOW_MS       = 3_600_000L; // 1 hour

    private static final int  JWT_SCAN_THRESHOLD       = 15;
    private static final long JWT_SCAN_WINDOW_MS       = 300_000L;  // 5 min

    private static final int  OTP_FLOOD_THRESHOLD      = 5;
    private static final long OTP_FLOOD_WINDOW_MS      = 600_000L;  // 10 min

    public SecurityDetectionService(@Lazy SecurityAuditService auditService,
                                    SecurityRateWindowTracker tracker,
                                    SecurityAlertNotifier alertNotifier) {
        this.auditService = auditService;
        this.tracker = tracker;
        this.alertNotifier = alertNotifier;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Call after every failed login attempt. */
    public void recordFailedLogin(String ip, String targetEmail) {
        if (ip == null) return;
        long now = System.currentTimeMillis();

        // Brute force tracking (per IP)
        Queue<Long> bf = tracker.failedLoginsForIp(ip);
        bf.add(now);
        tracker.pruneOld(bf, now, STUFFING_WINDOW_MS); // keep widest window

        int last10min = tracker.countRecent(bf, now, BRUTE_FORCE_WINDOW_MS);
        int last1hr   = bf.size();

        if (last1hr >= STUFFING_THRESHOLD) {
            generateAlert("CREDENTIAL_STUFFING", SecurityEventSeverity.CRITICAL,
                ip, null,
                "Credential stuffing detectado desde IP " + ip,
                last1hr + " intentos fallidos en 1 hora desde " + ip);
            auditService.logDetection(SecurityEventType.CREDENTIAL_STUFFING_DETECTED,
                SecurityEventSeverity.CRITICAL, ip, null,
                last1hr + " failed logins in 1h from " + ip);
        } else if (last10min >= BRUTE_FORCE_THRESHOLD) {
            generateAlert("BRUTE_FORCE", SecurityEventSeverity.HIGH,
                ip, null,
                "Brute force detectado desde IP " + ip,
                last10min + " intentos fallidos en 10 min desde " + ip);
            auditService.logDetection(SecurityEventType.BRUTE_FORCE_DETECTED,
                SecurityEventSeverity.HIGH, ip, null,
                last10min + " failed logins in 10min from " + ip);
        }

        // Password spray tracking (distinct targets per IP)
        if (targetEmail != null) {
            Set<String> targets = tracker.sprayTargetsForIp(ip, now, SPRAY_WINDOW_MS);
            targets.add(targetEmail.toLowerCase());

            if (targets.size() >= SPRAY_THRESHOLD) {
                generateAlert("PASSWORD_SPRAY", SecurityEventSeverity.HIGH,
                    ip, null,
                    "Password spray detectado desde IP " + ip,
                    targets.size() + " cuentas diferentes atacadas en 5 min desde " + ip);
                auditService.logDetection(SecurityEventType.SUSPICIOUS_ACTIVITY,
                    SecurityEventSeverity.HIGH, ip, null,
                    "Password spray: " + targets.size() + " distinct targets from " + ip);
            }
        }
    }

    /** Call after every invalid/expired JWT rejection. */
    public void recordInvalidJwt(String ip) {
        if (ip == null) return;
        long now = System.currentTimeMillis();

        Queue<Long> q = tracker.invalidJwtsForIp(ip);
        q.add(now);
        tracker.pruneOld(q, now, JWT_SCAN_WINDOW_MS);

        if (q.size() >= JWT_SCAN_THRESHOLD) {
            generateAlert("JWT_SCANNING", SecurityEventSeverity.MEDIUM,
                ip, null,
                "JWT scanning detectado desde IP " + ip,
                q.size() + " tokens inválidos en 5 min desde " + ip);
            auditService.logDetection(SecurityEventType.JWT_SCANNING_DETECTED,
                SecurityEventSeverity.MEDIUM, ip, null,
                q.size() + " invalid JWTs from " + ip + " in 5min");
        }
    }

    /** Call after every OTP send/resend for a user. */
    public void recordOtpRequest(Long userId) {
        if (userId == null) return;
        long now = System.currentTimeMillis();

        Queue<Long> q = tracker.otpRequestsForUser(userId);
        q.add(now);
        tracker.pruneOld(q, now, OTP_FLOOD_WINDOW_MS);

        if (q.size() >= OTP_FLOOD_THRESHOLD) {
            generateAlert("OTP_FLOOD", SecurityEventSeverity.MEDIUM,
                null, userId,
                "OTP flooding detectado para userId=" + userId,
                q.size() + " OTP requests en 10 min para userId=" + userId);
            auditService.logDetection(SecurityEventType.OTP_ABUSE_DETECTED,
                SecurityEventSeverity.MEDIUM, null, userId,
                q.size() + " OTP requests in 10min for userId=" + userId);
        }
    }

    // ── Alert generation ──────────────────────────────────────────────────────

    public void generateAlert(String alertType, SecurityEventSeverity severity,
                               String ip, Long userId, String message, String details) {
        alertNotifier.generateAlert(alertType, severity, ip, userId, message, details);
    }
}
