package com.hotclick.service;

import com.hotclick.model.SecurityAlert;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

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

    private static final Logger log = LoggerFactory.getLogger(SecurityDetectionService.class);

    @Autowired private SecurityAlertRepository alertRepo;
    @Autowired private SecurityAuditService    auditService;
    @Autowired private ResendEmailService      emailService;

    @Value("${security.alert.email:hotclick.cr@gmail.com}")
    private String securityAlertEmail;

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

    private static final long ALERT_COOLDOWN_MS        = 300_000L;  // 5 min dedup window

    // ── In-memory state ───────────────────────────────────────────────────────
    private final ConcurrentHashMap<String, Queue<Long>> failedLoginsByIp   = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Queue<Long>> invalidJwtsByIp    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Queue<Long>>   otpRequestsByUser  = new ConcurrentHashMap<>();

    // For password spray: track distinct target emails per IP within a rolling window
    private final ConcurrentHashMap<String, Set<String>>  sprayTargetsByIp   = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long>         sprayWindowStartMs = new ConcurrentHashMap<>();

    // Alert dedup: "TYPE:key" → last alert epoch ms
    private final ConcurrentHashMap<String, Long> alertCooldowns = new ConcurrentHashMap<>();

    public SecurityDetectionService() {
        ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "sec-detection-cleaner");
            t.setDaemon(true);
            return t;
        });
        cleaner.scheduleAtFixedRate(this::cleanup, 15, 15, TimeUnit.MINUTES);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Call after every failed login attempt. */
    public void recordFailedLogin(String ip, String targetEmail) {
        if (ip == null) return;
        long now = System.currentTimeMillis();

        // Brute force tracking (per IP)
        Queue<Long> bf = failedLoginsByIp.computeIfAbsent(ip, k -> new ConcurrentLinkedQueue<>());
        bf.add(now);
        pruneOld(bf, now, STUFFING_WINDOW_MS); // keep widest window

        int last10min = countRecent(bf, now, BRUTE_FORCE_WINDOW_MS);
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
            Long wsStart = sprayWindowStartMs.get(ip);
            if (wsStart == null || now - wsStart > SPRAY_WINDOW_MS) {
                sprayWindowStartMs.put(ip, now);
                sprayTargetsByIp.put(ip, ConcurrentHashMap.newKeySet());
            }
            Set<String> targets = sprayTargetsByIp.computeIfAbsent(ip, k -> ConcurrentHashMap.newKeySet());
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

        Queue<Long> q = invalidJwtsByIp.computeIfAbsent(ip, k -> new ConcurrentLinkedQueue<>());
        q.add(now);
        pruneOld(q, now, JWT_SCAN_WINDOW_MS);

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

        Queue<Long> q = otpRequestsByUser.computeIfAbsent(userId, k -> new ConcurrentLinkedQueue<>());
        q.add(now);
        pruneOld(q, now, OTP_FLOOD_WINDOW_MS);

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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generateAlert(String alertType, SecurityEventSeverity severity,
                               String ip, Long userId, String message, String details) {
        // Dedup key prevents alert spam
        String cooldownKey = alertType + ":" + (ip != null ? ip : "user:" + userId);
        long now = System.currentTimeMillis();
        Long lastAlert = alertCooldowns.get(cooldownKey);
        if (lastAlert != null && now - lastAlert < ALERT_COOLDOWN_MS) {
            return; // still in cooldown
        }
        alertCooldowns.put(cooldownKey, now);

        try {
            SecurityAlert alert = new SecurityAlert();
            alert.setAlertType(alertType);
            alert.setSeverity(severity.name());
            alert.setIpAddress(ip);
            alert.setUserId(userId);
            alert.setMessage(message);
            alert.setDetails(details);
            alert.setResolved(false);
            alert.setCreatedAt(LocalDateTime.now());
            alertRepo.save(alert);

            log.warn("[SEC-ALERT] type={} severity={} ip={} userId={} msg={}",
                alertType, severity, ip, userId, message);

            if (severity == SecurityEventSeverity.CRITICAL || severity == SecurityEventSeverity.HIGH) {
                notificarPorEmail(alertType, severity, ip, message, details);
            }
        } catch (Exception e) {
            log.error("[SEC-ALERT] Failed to persist alert type={}: {}", alertType, e.getMessage());
        }
    }

    private void notificarPorEmail(String alertType, SecurityEventSeverity severity,
                                    String ip, String message, String details) {
        Thread.ofVirtual().start(() -> {
            try {
                String asunto = "[HOTCLICK SEGURIDAD] " + severity + " — " + alertType;
                String html = "<div style='font-family:sans-serif;max-width:600px'>" +
                    "<h2 style='color:" + (severity == SecurityEventSeverity.CRITICAL ? "#dc2626" : "#d97706") + "'>" +
                    "Alerta de seguridad: " + alertType + "</h2>" +
                    "<table style='border-collapse:collapse;width:100%'>" +
                    "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Severidad</td>" +
                    "<td style='padding:6px 12px'>" + severity + "</td></tr>" +
                    "<tr style='background:#f9fafb'><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>IP</td>" +
                    "<td style='padding:6px 12px'>" + (ip != null ? ip : "—") + "</td></tr>" +
                    "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Mensaje</td>" +
                    "<td style='padding:6px 12px'>" + message + "</td></tr>" +
                    "<tr style='background:#f9fafb'><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Detalle</td>" +
                    "<td style='padding:6px 12px'>" + details + "</td></tr>" +
                    "</table>" +
                    "<p style='margin-top:16px;color:#6b7280;font-size:12px'>Ver todas las alertas en " +
                    "<a href='https://hotclick.lat/admin/security'>Security Center</a></p>" +
                    "</div>";
                emailService.send(securityAlertEmail, asunto, html);
            } catch (Exception e) {
                log.warn("[SEC-ALERT] No se pudo enviar email de alerta type={}: {}", alertType, e.getMessage());
            }
        });
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    private void cleanup() {
        try {
            long now = System.currentTimeMillis();
            // Remove fully-expired buckets
            failedLoginsByIp.entrySet().removeIf(e -> {
                pruneOld(e.getValue(), now, STUFFING_WINDOW_MS);
                return e.getValue().isEmpty();
            });
            invalidJwtsByIp.entrySet().removeIf(e -> {
                pruneOld(e.getValue(), now, JWT_SCAN_WINDOW_MS);
                return e.getValue().isEmpty();
            });
            otpRequestsByUser.entrySet().removeIf(e -> {
                pruneOld(e.getValue(), now, OTP_FLOOD_WINDOW_MS);
                return e.getValue().isEmpty();
            });
            // Expire spray windows
            sprayWindowStartMs.entrySet().removeIf(e -> now - e.getValue() > SPRAY_WINDOW_MS * 2);
            sprayTargetsByIp.entrySet().removeIf(e -> !sprayWindowStartMs.containsKey(e.getKey()));
            // Expire alert cooldowns
            alertCooldowns.entrySet().removeIf(e -> now - e.getValue() > ALERT_COOLDOWN_MS * 2);
        } catch (Exception e) {
            log.error("[SEC] Detection cleanup error: {}", e.getMessage());
        }
    }

    private void pruneOld(Queue<Long> queue, long now, long windowMs) {
        Long head;
        while ((head = queue.peek()) != null && now - head > windowMs) {
            queue.poll();
        }
    }

    private int countRecent(Queue<Long> queue, long now, long windowMs) {
        return (int) queue.stream().filter(t -> now - t <= windowMs).count();
    }
}
