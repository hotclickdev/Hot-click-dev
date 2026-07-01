package com.hotclick.controller;
import com.hotclick.utils.Constants;

import com.hotclick.model.IpBloqueada;
import com.hotclick.model.SecurityAlert;
import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.IpBloqueadaRepository;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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

    private static final Logger log = LoggerFactory.getLogger(SecurityController.class);

    @Autowired private SecurityAuditLogRepository auditRepo;
    @Autowired private SecurityAlertRepository    alertRepo;
    @Autowired private UsuarioRepository          usuarioRepo;
    @Autowired private IpBloqueadaRepository      ipBloqueadaRepo;

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
        alert.setResolvedAt(LocalDateTime.now(Constants.ZONA_CR));
        alertRepo.save(alert);
        log.info("[SEC] Alert {} resolved", id);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Alerta resuelta");
        return ResponseEntity.ok(resp);
    }

    // ── Usuarios con perfil de seguridad ─────────────────────────────────────

    @GetMapping("/usuarios/lista")
    public ResponseEntity<Map<String, Object>> getUsuariosSeguridadLista(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        int safePage = Math.max(0, page);
        int safeSize = Math.min(size, 50);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by("fechaUltimoAcceso").descending());
        var usuarios = usuarioRepo.findAll(pageable);

        List<Map<String, Object>> result = usuarios.getContent().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",                u.getId());
            m.put("nombre",            u.getNombre() + " " + (u.getApellidoPaterno() != null ? u.getApellidoPaterno() : ""));
            m.put("correo",            u.getCorreo());
            m.put("fechaRegistro",     u.getFechaRegistro());
            m.put("fechaUltimoAcceso", u.getFechaUltimoAcceso());
            m.put("intentosFallidos",  u.getIntentosFallidos());
            m.put("bloqueadoHasta",    u.getBloqueadoHasta());
            m.put("twoFactorEnabled",  Boolean.TRUE.equals(u.getTwoFactorEnabled()));
            m.put("twoFactorMethods",  u.getTwoFactorMethods());
            m.put("roles",             u.getRoles().stream().map(r -> r.getNombreRol()).collect(Collectors.toList()));
            long loginsOk   = auditRepo.countByEmailAndEventType(u.getCorreo(), "LOGIN_SUCCESS");
            long loginsFail = auditRepo.countByEmailAndEventType(u.getCorreo(), "LOGIN_FAILED");
            m.put("loginsExitosos",  loginsOk);
            m.put("loginsFallidos",  loginsFail);
            m.put("ipsDistintas",    auditRepo.findDistinctIpsByEmail(u.getCorreo()).size());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content",       result);
        resp.put("totalElements", usuarios.getTotalElements());
        resp.put("totalPages",    usuarios.getTotalPages());
        resp.put("page",          usuarios.getNumber());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/usuarios/{email}/eventos")
    public ResponseEntity<Map<String, Object>> getEventosPorUsuario(@PathVariable String email) {
        List<SecurityAuditLog> eventos = auditRepo.findTop50ByEmailOrderByTimestampDesc(email);
        List<String>           ips     = auditRepo.findDistinctIpsByEmail(email);

        Map<String, Long> porTipo = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countByEventTypeForEmail(email)) {
            porTipo.put((String) row[0], (Long) row[1]);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("eventos",    eventos);
        resp.put("ips",        ips);
        resp.put("porTipo",    porTipo);
        resp.put("total",      auditRepo.countByEmail(email));
        return ResponseEntity.ok(resp);
    }

    // ── Sesiones activas ──────────────────────────────────────────────────────

    @GetMapping("/sesiones-activas")
    public ResponseEntity<Map<String, Object>> getSesionesActivas() {
        LocalDateTime hace30m = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(30);
        LocalDateTime hace24h = LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
        long activas30m = auditRepo.countDistinctActiveUsers(hace30m);
        long activas24h = auditRepo.countDistinctActiveUsers(hace24h);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("activas30min", activas30m);
        resp.put("activas24h",   activas24h);
        return ResponseEntity.ok(resp);
    }

    // ── IPs sospechosas ───────────────────────────────────────────────────────

    @GetMapping("/ips-sospechosas")
    public ResponseEntity<List<Map<String, Object>>> getIpsSospechosas(
            @RequestParam(defaultValue = "24h") String period) {

        LocalDateTime from = periodToDateTime(period);
        var pageable = PageRequest.of(0, 20);
        List<Object[]> topIps  = auditRepo.topIpsByRequests(from, pageable);
        List<Object[]> fallidas = auditRepo.countByIpForEventTypeAfter("LOGIN_FAILED", from);
        Map<String, Long> fallidasMap = new HashMap<>();
        for (Object[] r : fallidas) {
            if (r[0] != null) fallidasMap.put((String) r[0], (Long) r[1]);
        }

        List<Map<String, Object>> result = topIps.stream().map(row -> {
            String ip    = (String)        row[0];
            long   total = (Long)          row[1];
            Object last  =                 row[2];
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ip",             ip);
            m.put("totalRequests",  total);
            m.put("loginsFallidos", fallidasMap.getOrDefault(ip, 0L));
            m.put("ultimoEvento",   last);
            m.put("bloqueada",      ipBloqueadaRepo.existsByIpAddressAndActivaTrue(ip));
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── IPs bloqueadas ────────────────────────────────────────────────────────

    @GetMapping("/ips-bloqueadas")
    public ResponseEntity<List<IpBloqueada>> getIpsBloqueadas() {
        return ResponseEntity.ok(ipBloqueadaRepo.findAllByOrderByFechaBloqueoDesc());
    }

    @PostMapping("/ips-bloqueadas")
    public ResponseEntity<Map<String, Object>> bloquearIp(@RequestBody Map<String, String> body) {
        String ip     = body.get("ip");
        String motivo = body.getOrDefault("motivo", "Bloqueada manualmente");
        if (ip == null || ip.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "IP requerida"));
        }
        String quien = SecurityContextHolder.getContext().getAuthentication().getName();
        IpBloqueada bloqueo = ipBloqueadaRepo.findByIpAddressAndActivaTrue(ip)
            .orElse(new IpBloqueada());
        bloqueo.setIpAddress(ip.trim());
        bloqueo.setMotivo(motivo);
        bloqueo.setBloqueadaPor(quien);
        bloqueo.setFechaBloqueo(LocalDateTime.now(Constants.ZONA_CR));
        bloqueo.setActiva(true);
        ipBloqueadaRepo.save(bloqueo);
        log.warn("[SEC] IP bloqueada: {} por {}", ip, quien);
        return ResponseEntity.ok(Map.of("success", true, "message", "IP bloqueada"));
    }

    @DeleteMapping("/ips-bloqueadas/{ip}")
    public ResponseEntity<Map<String, Object>> desbloquearIp(@PathVariable String ip) {
        ipBloqueadaRepo.findByIpAddressAndActivaTrue(ip).ifPresent(b -> {
            b.setActiva(false);
            ipBloqueadaRepo.save(b);
            log.info("[SEC] IP desbloqueada: {}", ip);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "IP desbloqueada"));
    }

    // ── Export CSV ────────────────────────────────────────────────────────────

    @GetMapping("/eventos/export")
    public void exportEventosCsv(
            @RequestParam(defaultValue = "7d") String period,
            HttpServletResponse response) throws IOException {

        LocalDateTime from = periodToDateTime(period);
        List<SecurityAuditLog> eventos = auditRepo.findByTimestampAfterOrderByTimestampDesc(from);

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition",
            "attachment; filename=\"security-log-" +
            LocalDateTime.now(Constants.ZONA_CR).format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")) + ".csv\"");

        PrintWriter w = response.getWriter();
        w.println("timestamp,tipo,severidad,ip,email,endpoint,userAgent");
        for (SecurityAuditLog e : eventos) {
            w.printf("%s,%s,%s,%s,%s,%s,%s%n",
                e.getTimestamp(),
                csv(e.getEventType()),
                csv(e.getSeverity()),
                csv(e.getIpAddress()),
                csv(e.getEmail()),
                csv(e.getEndpoint()),
                csv(e.getUserAgent()));
        }
        w.flush();
    }

    private String csv(String v) {
        if (v == null) return "";
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private LocalDateTime periodToDateTime(String period) {
        return switch (period) {
            case "1h"  -> LocalDateTime.now(Constants.ZONA_CR).minusHours(1);
            case "24h" -> LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
            case "7d"  -> LocalDateTime.now(Constants.ZONA_CR).minusDays(7);
            case "30d" -> LocalDateTime.now(Constants.ZONA_CR).minusDays(30);
            case "90d" -> LocalDateTime.now(Constants.ZONA_CR).minusDays(90);
            default    -> LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
        };
    }
}
