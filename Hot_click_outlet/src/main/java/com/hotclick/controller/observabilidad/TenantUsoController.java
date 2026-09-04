package com.hotclick.controller.observabilidad;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.tenant.TenantUsoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Drill-down de uso por tenant (GMV, pedidos, créditos IA). Solo ADMIN.
 *
 * GET /api/admin/observabilidad/uso-tenants
 * GET /api/admin/observabilidad/uso-tenants/{empresaId}
 */
@RestController
@RequestMapping("/api/admin/observabilidad/uso-tenants")
@PreAuthorize("hasRole('ADMIN')")
public class TenantUsoController {

    @Autowired private TenantUsoService tenantUsoService;

    @GetMapping
    public ResponseEntity<ResponseDTO> ranking(
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {
        return ResponseEntity.ok(ResponseDTO.success(
            "Uso por tenant", tenantUsoService.ranking(anio, mes)));
    }

    @GetMapping("/{empresaId}")
    public ResponseEntity<ResponseDTO> detalle(
            @PathVariable Long empresaId,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {
        return ResponseEntity.ok(ResponseDTO.success(
            "Uso del tenant", tenantUsoService.detalle(empresaId, anio, mes)));
    }
}
