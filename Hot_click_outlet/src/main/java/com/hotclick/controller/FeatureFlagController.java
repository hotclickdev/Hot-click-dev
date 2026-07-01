package com.hotclick.controller;

import com.hotclick.service.FeatureFlagService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de gestión de feature flags — solo ADMIN.
 *
 * GET  /api/admin/flags                        — todos los flags del registro
 * GET  /api/admin/flags/{empresaId}            — estado de flags para una empresa
 * POST /api/admin/flags/{empresaId}/{flag}/on  — activar flag (con fecha_exp opcional)
 * POST /api/admin/flags/{empresaId}/{flag}/off — desactivar flag
 */
@RestController
@RequestMapping("/api/admin/flags")
@PreAuthorize("hasRole('ADMIN')")
public class FeatureFlagController {

    private final FeatureFlagService flagService;

    public FeatureFlagController(FeatureFlagService flagService) {
        this.flagService = flagService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listarFlags() {
        return ResponseEntity.ok(flagService.listarTodos());
    }

    @GetMapping("/{empresaId}")
    public ResponseEntity<List<Map<String, Object>>> estadoPorEmpresa(
            @PathVariable Long empresaId) {
        return ResponseEntity.ok(flagService.getEstadoFlags(empresaId));
    }

    @PostMapping("/{empresaId}/{flagNombre}/on")
    public ResponseEntity<Void> activar(
            @PathVariable Long empresaId,
            @PathVariable String flagNombre,
            @RequestParam(required = false) String fechaExp) {
        flagService.activar(empresaId, flagNombre, fechaExp);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{empresaId}/{flagNombre}/off")
    public ResponseEntity<Void> desactivar(
            @PathVariable Long empresaId,
            @PathVariable String flagNombre) {
        flagService.desactivar(empresaId, flagNombre);
        return ResponseEntity.ok().build();
    }
}
