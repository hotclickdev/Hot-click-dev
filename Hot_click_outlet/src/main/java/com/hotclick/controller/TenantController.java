package com.hotclick.controller;

import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.TenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TenantController {

    private final TenantService tenantService;
    private final PlanRepository planRepo;

    public TenantController(TenantService tenantService, PlanRepository planRepo) {
        this.tenantService = tenantService;
        this.planRepo = planRepo;
    }

    /**
     * Información del tenant activo: plan, límites, features, días de trial.
     * El frontend carga esto al login y lo guarda en tenantStore.
     */
    @GetMapping("/tenant/info")
    public ResponseEntity<Map<String, Object>> tenantInfo() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            return ResponseEntity.ok(Map.of("planNombre", "ADMIN_IT", "features", Map.of()));
        }
        return ResponseEntity.ok(tenantService.getTenantInfo(empresaId));
    }

    /**
     * Uso actual del tenant: conteo de productos y usuarios activos.
     * Permite que el frontend muestre barras de progreso de límites.
     */
    @GetMapping("/tenant/uso")
    public ResponseEntity<Map<String, Object>> tenantUso() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.ok(Map.of());
        return ResponseEntity.ok(tenantService.getTenantUso(empresaId));
    }

    /**
     * Listado de planes disponibles — público, para la página de pricing.
     */
    @GetMapping("/planes")
    public ResponseEntity<List<Plan>> planesPublicos() {
        return ResponseEntity.ok(planRepo.findByActivoTrueOrderByPrecioMensualAsc());
    }
}
