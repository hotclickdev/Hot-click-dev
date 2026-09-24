package com.hotclick.controller;

import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.TenantService;
import com.hotclick.service.prueba.PruebaPlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TenantController {

    private final TenantService tenantService;
    private final PlanRepository planRepo;
    private final PruebaPlanService pruebaPlanService;

    public TenantController(TenantService tenantService, PlanRepository planRepo,
                            PruebaPlanService pruebaPlanService) {
        this.tenantService = tenantService;
        this.planRepo = planRepo;
        this.pruebaPlanService = pruebaPlanService;
    }

    /**
     * Información del tenant activo: plan, límites, features, días de trial.
     * El frontend carga esto al login y lo guarda en tenantStore.
     */
    @GetMapping("/tenant/info")
    public ResponseEntity<Map<String, Object>> tenantInfo() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            return ResponseEntity.ok(Map.of("planNombre", "ADMIN", "features", Map.of()));
        }
        pruebaPlanService.cerrarSiVencio(empresaId);
        return ResponseEntity.ok(tenantService.getTenantInfo(empresaId));
    }

    /** La prueba de un mes ya cerró: el dueño pide que un admin la reabra. */
    @PostMapping("/tenant/solicitar-autorizacion")
    public ResponseEntity<Map<String, String>> solicitarAutorizacion() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Sin negocio activo"));
        }
        try {
            return ResponseEntity.ok(pruebaPlanService.solicitarAutorizacion(empresaId));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(409).body(Map.of("error", ex.getMessage()));
        }
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
