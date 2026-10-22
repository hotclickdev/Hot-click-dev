package com.hotclick.controller.pendientes;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** S5-22 (esqueleto): solicitudes de reembolso que ve el negocio. Depende de S5-21 y S5-05. */
@RestController
@RequestMapping("/api/negocio/reembolsos")
@PreAuthorize("hasRole('EMPRENDEDOR')")
public class ReembolsoNegocioController {

    private static final String FALTA = "política de reembolsos (S5-05) y la solicitud del comprador (S5-21)";

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(@RequestParam(defaultValue = "pendientes") String vista) {
        if (!"pendientes".equals(vista) && !"historial".equals(vista)) {
            return PendienteDecision.error(HttpStatus.BAD_REQUEST, "VISTA_INVALIDA", "vista debe ser pendientes o historial");
        }
        return PendienteDecision.respuesta("S5-22", FALTA);
    }

    @PostMapping("/{id}/aprobar")
    public ResponseEntity<Map<String, Object>> aprobar(@PathVariable Long id) {
        return PendienteDecision.respuesta("S5-22", FALTA);
    }

    @PostMapping("/{id}/rechazar")
    public ResponseEntity<Map<String, Object>> rechazar(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        Object motivo = body != null ? body.get("motivo") : null;
        if (motivo == null || motivo.toString().trim().length() < 3) {
            return PendienteDecision.error(HttpStatus.BAD_REQUEST, "MOTIVO_INVALIDO", "El motivo debe tener al menos 3 caracteres");
        }
        return PendienteDecision.respuesta("S5-22", FALTA);
    }
}
