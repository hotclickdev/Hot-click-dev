package com.hotclick.controller;

import com.hotclick.security.TenantContext;
import com.hotclick.service.InventoryForecastService;
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

    /** Full AI dashboard: at-risk, slow movers, ABC summary. */
    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        return ResponseEntity.ok(forecastService.dashboard(TenantContext.get()));
    }

    /** Trigger immediate ABC analysis for the current empresa (admin action). */
    @PostMapping("/analizar")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> analizar() {
        forecastService.actualizarAnalisisEmpresa(TenantContext.get());
        return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Análisis completado"));
    }
}
