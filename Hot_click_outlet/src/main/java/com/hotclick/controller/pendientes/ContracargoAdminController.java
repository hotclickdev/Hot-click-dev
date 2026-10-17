package com.hotclick.controller.pendientes;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/** S5-23 (esqueleto): contracargos. Plazo, retención y webhook de disputas: ONVO y decisión del dueño (S5-05). */
@RestController
@RequestMapping("/api/admin/contracargos")
@PreAuthorize("hasRole('ADMIN')")
public class ContracargoAdminController {

    private static final String FALTA = "política de contracargos (S5-05), webhook de disputas de ONVO y bucket privado";

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar() { return PendienteDecision.respuesta("S5-23", FALTA); }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> ver(@PathVariable Long id) { return PendienteDecision.respuesta("S5-23", FALTA); }

    @PostMapping("/{id}/pruebas")
    public ResponseEntity<Map<String, Object>> subirPrueba(@PathVariable Long id,
                                                           @RequestParam(value = "archivo", required = false) MultipartFile archivo) {
        return PendienteDecision.respuesta("S5-23", FALTA);
    }

    @DeleteMapping("/{id}/pruebas/{pruebaId}")
    public ResponseEntity<Map<String, Object>> borrarPrueba(@PathVariable Long id, @PathVariable Long pruebaId) {
        return PendienteDecision.respuesta("S5-23", FALTA);
    }

    @PostMapping("/{id}/responder")
    public ResponseEntity<Map<String, Object>> responder(@PathVariable Long id) { return PendienteDecision.respuesta("S5-23", FALTA); }
}
