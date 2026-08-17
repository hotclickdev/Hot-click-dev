package com.hotclick.service.security;

import com.hotclick.model.SecurityAlert;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.service.ResendEmailService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class SecurityAlertNotifier {

    private static final Logger log = LoggerFactory.getLogger(SecurityAlertNotifier.class);
    private static final long ALERT_COOLDOWN_MS = 300_000L;

    private final SecurityAlertRepository alertRepo;
    private final ResendEmailService emailService;
    private final SecurityRateWindowTracker tracker;

    @Value("${security.alert.email:hotclick.cr@gmail.com}")
    private String securityAlertEmail;

    public SecurityAlertNotifier(SecurityAlertRepository alertRepo,
                                 ResendEmailService emailService,
                                 SecurityRateWindowTracker tracker) {
        this.alertRepo = alertRepo;
        this.emailService = emailService;
        this.tracker = tracker;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generateAlert(String alertType, SecurityEventSeverity severity,
                              String ip, Long userId, String message, String details) {
        String cooldownKey = alertType + ":" + (ip != null ? ip : "user:" + userId);
        long now = System.currentTimeMillis();
        if (tracker.isAlertCoolingDown(cooldownKey, now, ALERT_COOLDOWN_MS)) {
            return;
        }
        tracker.markAlertCooldown(cooldownKey, now);

        try {
            SecurityAlert alert = new SecurityAlert();
            alert.setAlertType(alertType);
            alert.setSeverity(severity.name());
            alert.setIpAddress(ip);
            alert.setUserId(userId);
            alert.setMessage(message);
            alert.setDetails(details);
            alert.setResolved(false);
            alert.setCreatedAt(LocalDateTime.now(Constants.ZONA_CR));
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
}
