package com.hotclick.controller;

import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.TenantService;
import com.hotclick.service.prueba.PruebaPlanService;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TenantController {

    private final TenantService tenantService;
    private final PlanRepository planRepo;
    private final PruebaPlanService pruebaPlanService;
    private final PreciosPlanesConfig preciosPlanes;

    public TenantController(TenantService tenantService, PlanRepository planRepo,
                            PruebaPlanService pruebaPlanService, PreciosPlanesConfig preciosPlanes) {
        this.tenantService = tenantService;
        this.planRepo = planRepo;
        this.pruebaPlanService = pruebaPlanService;
        this.preciosPlanes = preciosPlanes;
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
     * Listado de planes disponibles — público, para la página de pricing (/planes).
     * ALTO: {@code precioUsd} sale SOLO de la config de precios (la misma que {@code PrecioPlanOnvo} verifica contra el
     * price de ONVO), nunca de la columna precio_usd de la tabla plan (V89/V105: 19.99 / 11.99). Si un plan no tiene
     * precio configurado, se publica con {@code precioUsd: null} (la UI muestra «Mensualidad en dólares», sin monto
     * inventado) en vez de un precio viejo. Los límites y features siguen saliendo de la tabla plan.
     */
    @GetMapping("/planes")
    public ResponseEntity<List<Map<String, Object>>> planesPublicos() {
        List<Map<String, Object>> out = planRepo.findByActivoTrueOrderByPrecioMensualAsc().stream()
            .map(this::planPublico)
            .toList();
        return ResponseEntity.ok(out);
    }

    /** Mismos campos que exponía la entidad, con precioUsd reemplazado por el de la config (o null). */
    private Map<String, Object> planPublico(Plan p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("nombre", p.getNombre());
        m.put("descripcion", p.getDescripcion());
        m.put("precioMensual", p.getPrecioMensual());
        m.put("maxUsuarios", p.getMaxUsuarios());
        m.put("maxProductos", p.getMaxProductos());
        m.put("maxBodegas", p.getMaxBodegas());
        m.put("maxCajas", p.getMaxCajas());
        m.put("tienePos", p.getTienePos());
        m.put("tieneCrm", p.getTieneCrm());
        m.put("tieneCompras", p.getTieneCompras());
        m.put("tieneReportes", p.getTieneReportes());
        m.put("tieneAi", p.getTieneAi());
        m.put("tieneApi", p.getTieneApi());
        m.put("tieneGiftCards", p.getTieneGiftCards());
        m.put("activo", p.getActivo());
        m.put("maxCreditosAi", p.getMaxCreditosAi());
        m.put("precioUsd", preciosPlanes.precioPublicoUsd(p.getNombre()).orElse(null));
        m.put("comisionPorcentaje", p.getComisionPorcentaje());
        m.put("comisionMinimaCrc", p.getComisionMinimaCrc());
        return m;
    }
}
