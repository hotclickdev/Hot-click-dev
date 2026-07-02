package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.TenantContext;
import com.hotclick.service.InventoryForecastService;
import com.hotclick.service.TenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/inventario")
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
public class InventarioController {

    @Autowired private InventoryForecastService forecastService;
    @Autowired private CompanyScope             companyScope;
    @Autowired private TenantService            tenantService;

    private static final String MSG_REQUIERE_AI =
        "AI Inventario requiere un plan PYME o superior. Ve a Configuración → Suscripción para mejorar tu plan.";

    /** Full AI dashboard: at-risk, slow movers, ABC summary. */
    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("ai"))
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_AI));
        return ResponseEntity.ok(forecastService.dashboard(TenantContext.get()));
    }

    /** Trigger immediate ABC analysis for the current empresa (admin action). */
    @PostMapping("/analizar")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> analizar() {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("ai"))
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_AI));
        forecastService.actualizarAnalisisEmpresa(TenantContext.get());
        return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Análisis completado"));
    }
}
