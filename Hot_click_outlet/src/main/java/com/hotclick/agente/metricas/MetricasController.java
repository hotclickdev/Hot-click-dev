package com.hotclick.agente.metricas;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PermiteLector;
import com.hotclick.service.TenantService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Métricas del bot de ventas (AG-32). Solo lectura y sin id de recurso en la ruta: el alcance sale de
 * {@link CompanyScope}, nunca de un parámetro (no hay empresaId que un negocio pueda cambiar). Cada negocio ve lo
 * suyo; el ADMIN (sin impersonar) ve el bot de HotClick y el total de la plataforma. Exige la feature "ai" del plan,
 * igual que la bandeja.
 */
@RestController
@RequestMapping("/api/agente/metricas")
public class MetricasController {

    private final MetricasService service;
    private final CompanyScope companyScope;
    private final TenantService tenantService;

    public MetricasController(MetricasService service, CompanyScope companyScope, TenantService tenantService) {
        this.service = service;
        this.companyScope = companyScope;
        this.tenantService = tenantService;
    }

    @GetMapping
    @PermiteLector // lectura de cifras del negocio propio
    public ResponseEntity<MetricasDtos.Respuesta> metricas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        Long scope = companyScope.requireEmpresaIdOrAdmin();
        if (scope != null && !tenantService.tieneFeature("ai")) {
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
        }
        return ResponseEntity.ok(service.consultar(scope, desde, hasta));
    }
}
