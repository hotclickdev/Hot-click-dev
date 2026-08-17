package com.hotclick.controller.security;

import com.hotclick.model.SecurityAlert;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Alertas del Security Center.
 * Extraído bit-idéntico de SecurityController — no cambia comportamiento.
 */
@Component
class SecurityAlertsHandler {

    private static final Logger log = LoggerFactory.getLogger(SecurityAlertsHandler.class);

    @Autowired private SecurityAlertRepository alertRepo;

    ResponseEntity<List<SecurityAlert>> getAlerts(boolean resolved) {
        return ResponseEntity.ok(alertRepo.findByResolvedOrderByCreatedAtDesc(resolved));
    }

    ResponseEntity<Map<String, Object>> resolveAlert(Long id) {
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
}
