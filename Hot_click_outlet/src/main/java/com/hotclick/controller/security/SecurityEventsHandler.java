package com.hotclick.controller.security;

import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Log de eventos y export CSV del Security Center.
 * Extraído bit-idéntico de SecurityController — no cambia comportamiento.
 */
@Component
class SecurityEventsHandler {

    @Autowired private SecurityAuditLogRepository auditRepo;

    ResponseEntity<Map<String, Object>> getEvents(int page, int size, String type,
                                                   String severity, String period) {
        size = Math.min(size, 100);
        LocalDateTime from = SecurityControllerHelpers.periodToDateTime(period);
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

    void exportEventosCsv(String period, HttpServletResponse response) throws IOException {
        LocalDateTime from = SecurityControllerHelpers.periodToDateTime(period);
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
                SecurityControllerHelpers.csv(e.getEventType()),
                SecurityControllerHelpers.csv(e.getSeverity()),
                SecurityControllerHelpers.csv(e.getIpAddress()),
                SecurityControllerHelpers.csv(e.getEmail()),
                SecurityControllerHelpers.csv(e.getEndpoint()),
                SecurityControllerHelpers.csv(e.getUserAgent()));
        }
        w.flush();
    }
}
