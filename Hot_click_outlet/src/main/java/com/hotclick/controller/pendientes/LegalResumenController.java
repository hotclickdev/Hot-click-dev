package com.hotclick.controller.pendientes;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

/**
 * Frontend S5-24 (esqueleto): resumen de textos legales. Los textos los redacta y aprueba Legal (LEG-6 a LEG-11);
 * mientras no haya uno aprobado, el público recibe 404 (contrato del front) y el admin 501.
 */
@RestController
public class LegalResumenController {

    static final Set<String> DOCUMENTOS = Set.of("terminos", "privacidad", "devoluciones");

    @GetMapping("/api/public/legal/{documento}/resumen")
    public ResponseEntity<Map<String, Object>> publico(@PathVariable String documento) {
        if (!DOCUMENTOS.contains(documento)) {
            return PendienteDecision.error(HttpStatus.BAD_REQUEST, "DOCUMENTO_INVALIDO", "Documento no válido");
        }
        return PendienteDecision.error(HttpStatus.NOT_FOUND, "SIN_RESUMEN_APROBADO", "Todavía no hay un resumen aprobado");
    }

    @GetMapping("/api/admin/legal/{documento}/resumen")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> admin(@PathVariable String documento) {
        if (!DOCUMENTOS.contains(documento)) {
            return PendienteDecision.error(HttpStatus.BAD_REQUEST, "DOCUMENTO_INVALIDO", "Documento no válido");
        }
        return PendienteDecision.respuesta("S5-24", "textos legales aprobados por Legal y el dueño (LEG-6 a LEG-11)");
    }
}
