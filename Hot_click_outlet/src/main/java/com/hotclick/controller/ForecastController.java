package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.TenantContext;
import com.hotclick.service.DemandForecastService;
import com.hotclick.service.TenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/forecast")
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
public class ForecastController {

    @Autowired private DemandForecastService forecastService;
    @Autowired private CompanyScope          companyScope;
    @Autowired private TenantService         tenantService;

    private static final String MSG_REQUIERE_AI =
        "AI Forecast requiere un plan PYME o superior. Ve a Configuración → Suscripción para mejorar tu plan.";

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("ai"))
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_AI));
        return ResponseEntity.ok(forecastService.getForecastDashboard(TenantContext.get()));
    }

    @PostMapping("/generar")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> generar() {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("ai"))
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_AI));
        forecastService.generarForecast(TenantContext.get());
        return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Pronóstico generado"));
    }
}
