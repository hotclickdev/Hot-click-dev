package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.fiscal.VerificarFiscalRequest;
import com.hotclick.service.fiscal.FiscalPendientesService;
import com.hotclick.service.fiscal.FiscalVerificacionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Verificación de la inscripción en Hacienda de un negocio. Solo ADMIN de plataforma. */
@RestController
public class AdminFiscalVerificacionController {

    private final FiscalVerificacionService verificacion;
    private final FiscalPendientesService pendientes;

    public AdminFiscalVerificacionController(FiscalVerificacionService verificacion, FiscalPendientesService pendientes) {
        this.verificacion = verificacion;
        this.pendientes = pendientes;
    }

    @GetMapping("/api/admin/empresas/fiscal/pendientes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> pendientes() {
        return ResponseEntity.ok(ResponseDTO.success("Pendientes de verificar", pendientes.pendientes()));
    }

    @GetMapping("/api/admin/empresas/{id}/fiscal")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Datos fiscales", verificacion.detalle(id)));
    }

    /** Repite la consulta a Hacienda (la API pudo fallar la primera vez). Solo informa; no aprueba. */
    @PostMapping("/api/admin/empresas/{id}/fiscal/reconsultar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> reconsultar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Consulta a Hacienda", verificacion.reconsultar(id)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/api/admin/empresas/{id}/fiscal/verificar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> verificar(@PathVariable Long id, @Valid @RequestBody VerificarFiscalRequest body) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Verificación registrada",
                verificacion.verificar(id, "APROBAR".equals(body.decision()), body.motivo())));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        }
    }
}
