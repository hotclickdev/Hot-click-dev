package com.hotclick.controller.pendientes;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Esqueletos de S5 (reembolsos, contracargos, facturación manual, textos legales): la ruta, la
 * autorización y la validación de entrada ya existen; la regla de negocio espera decisiones del dueño.
 * Responden 501 con un código estable y no inventan plazos ni montos.
 */
final class PendienteDecision {

    static final String CODE = "PENDIENTE_DECISION_DUENO";

    private PendienteDecision() {}

    static ResponseEntity<Map<String, Object>> respuesta(String historia, String falta) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", false);
        m.put("code", CODE);
        m.put("historia", historia);
        m.put("message", "Todavía no disponible: " + falta);
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(m);
    }

    static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", false);
        m.put("code", code);
        m.put("message", message);
        return ResponseEntity.status(status).body(m);
    }
}
