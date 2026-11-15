package com.hotclick.controller;

import com.hotclick.security.TenantContext;
import com.hotclick.service.TenantService;
import com.hotclick.service.prueba.PruebaPlanService;
import com.hotclick.service.suscripcion.PlanPublicoMapper;
import com.hotclick.service.suscripcion.PlanPublicoVista;
import com.hotclick.service.suscripcion.PlanesActivosLector;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TenantController {

    private final TenantService tenantService;
    private final PlanesActivosLector planesActivos;
    private final PruebaPlanService pruebaPlanService;
    private final PreciosPlanesConfig preciosPlanes;

    public TenantController(TenantService tenantService, PlanesActivosLector planesActivos,
                            PruebaPlanService pruebaPlanService, PreciosPlanesConfig preciosPlanes) {
        this.tenantService = tenantService;
        this.planesActivos = planesActivos;
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
     * precio publicable, va {@code precioUsd: null} (la UI muestra «Mensualidad en dólares», sin monto inventado).
     * Se listan TODOS los planes activos con {@link PlanesActivosLector} (el mismo lector que /api/billing/planes):
     * páginas acotadas en una transacción REPEATABLE READ de solo lectura, orden precio_mensual e id. La respuesta es la
     * lista completa; si una página falla no se devuelve una lista parcial. Un plan activo sin precio publicable va con
     * precioUsd null (no se esconde).
     */
    @GetMapping("/planes")
    public ResponseEntity<List<Map<String, Object>>> planesPublicos() {
        List<PlanPublicoVista> planes = planesActivos.activos(
            PageRequest.of(0, PlanesActivosLector.TAMANO_PAGINA, PlanesActivosLector.ORDEN));
        return ResponseEntity.ok(planes.stream().map(this::planPublico).toList());
    }

    /** Campos comunes del plan + los que esta API exponía de la entidad, con precioUsd de la config (o null). */
    private Map<String, Object> planPublico(PlanPublicoVista p) {
        Map<String, Object> m = PlanPublicoMapper.base(p);
        m.put("activo", p.activo());
        m.put("maxCreditosAi", p.maxCreditosAi());
        m.put("precioUsd", preciosPlanes.precioPublicoUsd(p.nombre()).orElse(null));
        m.put("comisionPorcentaje", p.comisionPorcentaje());
        m.put("comisionMinimaCrc", p.comisionMinimaCrc());
        return m;
    }
}
