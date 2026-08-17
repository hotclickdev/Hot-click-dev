package com.hotclick.controller.security;

import com.hotclick.model.IpBloqueada;
import com.hotclick.repository.IpBloqueadaRepository;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Sesiones activas, IPs sospechosas y bloqueo/desbloqueo del Security Center.
 * Extraído bit-idéntico de SecurityController — no cambia comportamiento.
 */
@Component
class SecurityIpHandler {

    private static final Logger log = LoggerFactory.getLogger(SecurityIpHandler.class);

    @Autowired private SecurityAuditLogRepository auditRepo;
    @Autowired private IpBloqueadaRepository      ipBloqueadaRepo;

    ResponseEntity<Map<String, Object>> getSesionesActivas() {
        LocalDateTime hace30m = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(30);
        LocalDateTime hace24h = LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
        long activas30m = auditRepo.countDistinctActiveUsers(hace30m);
        long activas24h = auditRepo.countDistinctActiveUsers(hace24h);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("activas30min", activas30m);
        resp.put("activas24h",   activas24h);
        return ResponseEntity.ok(resp);
    }

    ResponseEntity<List<Map<String, Object>>> getIpsSospechosas(String period) {
        LocalDateTime from = SecurityControllerHelpers.periodToDateTime(period);
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

    ResponseEntity<List<IpBloqueada>> getIpsBloqueadas() {
        return ResponseEntity.ok(ipBloqueadaRepo.findAllByOrderByFechaBloqueoDesc());
    }

    ResponseEntity<Map<String, Object>> bloquearIp(Map<String, String> body) {
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

    ResponseEntity<Map<String, Object>> desbloquearIp(String ip) {
        ipBloqueadaRepo.findByIpAddressAndActivaTrue(ip).ifPresent(b -> {
            b.setActiva(false);
            ipBloqueadaRepo.save(b);
            log.info("[SEC] IP desbloqueada: {}", ip);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "IP desbloqueada"));
    }
}
