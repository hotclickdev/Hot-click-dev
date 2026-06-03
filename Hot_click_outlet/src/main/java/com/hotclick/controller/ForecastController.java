package com.hotclick.controller;

import com.hotclick.security.TenantContext;
import com.hotclick.service.DemandForecastService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/forecast")
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT','ADMIN_CLIENTE')")
public class ForecastController {

    @Autowired private DemandForecastService forecastService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        return ResponseEntity.ok(forecastService.getForecastDashboard(TenantContext.get()));
    }

    @PostMapping("/generar")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> generar() {
        forecastService.generarForecast(TenantContext.get());
        return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Pronóstico generado"));
    }
}
