package com.hotclick.controller;

import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.SuscripcionService;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * API de billing para el panel admin.
 * Rutas bajo /api/billing — requieren rol EMPRENDEDOR o ADMIN.
 */
@RestController
@RequestMapping("/api/billing")
public class SuscripcionController {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionController.class);

    private final SuscripcionService suscripcionService;
    private final PlanRepository planRepo;

    public SuscripcionController(SuscripcionService suscripcionService,
                                  PlanRepository planRepo) {
        this.suscripcionService = suscripcionService;
        this.planRepo           = planRepo;
    }

    /** Lista todos los planes disponibles (públicos). */
    @GetMapping("/planes")
    public ResponseEntity<List<Map<String, Object>>> listarPlanes() {
        List<Plan> planes = planRepo.findByActivoTrueOrderByPrecioMensualAsc();
        List<Map<String, Object>> result = planes.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("nombre", p.getNombre());
            m.put("descripcion", p.getDescripcion());
            // precioMensual en colones (UI / cobro ONVO). precioUsd es legado.
            m.put("precioMensual", p.getPrecioMensual());
            m.put("precioUsd", p.getPrecioUsd());
            m.put("comisionPorcentaje", p.getComisionPorcentaje());
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
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /** Estado de suscripción activa de la empresa del tenant. */
    @GetMapping("/suscripcion")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getSuscripcion() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(suscripcionService.getSuscripcionInfo(empresaId));
    }

    /** Historial de facturas SaaS de la empresa. */
    @GetMapping("/facturas")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getFacturas(
            @RequestParam(defaultValue = "0") int pagina) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(suscripcionService.getFacturas(empresaId, pagina));
    }

    /** Inicia trial de 14 días para la empresa (solo si no tiene suscripción activa). */
    @PostMapping("/trial")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> iniciarTrial() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        suscripcionService.iniciarTrial(empresaId);
        return ResponseEntity.ok(Map.of("status", "ok", "mensaje", "Trial iniciado por 14 días"));
    }

    /** Genera URL de Stripe Checkout para suscribirse a un plan. */
    @PostMapping("/checkout/{planId}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> crearCheckout(@PathVariable Long planId) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        try {
            String url = suscripcionService.crearCheckoutUrl(empresaId, planId);
            return ResponseEntity.ok(Map.of("checkoutUrl", url));
        } catch (StripeException e) {
            log.error("[billing] Error creando checkout empresa={}: {}", empresaId, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con Stripe: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Genera URL del Customer Portal de Stripe (auto-gestión de pago/facturación). */
    @PostMapping("/portal")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> crearPortal() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        try {
            String url = suscripcionService.crearPortalUrl(empresaId);
            return ResponseEntity.ok(Map.of("portalUrl", url));
        } catch (StripeException e) {
            log.error("[billing] Error creando portal empresa={}: {}", empresaId, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con Stripe"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Cancela la suscripción activa (al final del período por defecto). */
    @PostMapping("/cancelar")
    @PreAuthorize("hasRole('EMPRENDEDOR')")
    public ResponseEntity<Map<String, Object>> cancelar(
            @RequestParam(defaultValue = "false") boolean inmediata) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        try {
            suscripcionService.cancelar(empresaId, inmediata);
            return ResponseEntity.ok(Map.of("status", "ok",
                "mensaje", inmediata ? "Suscripción cancelada" : "Se cancelará al vencer el período"));
        } catch (StripeException e) {
            log.error("[billing] Error cancelando empresa={}: {}", empresaId, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con Stripe"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cambia el plan SaaS vía ONVO (self-service).
     * No activa el plan local hasta el webhook (salvo mock).
     */
    @PostMapping("/cambiar-plan/{planId}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> cambiarPlan(@PathVariable Long planId) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(suscripcionService.cambiarPlanOnvo(empresaId, planId));
        } catch (IllegalArgumentException | IllegalStateException | NoSuchElementException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[billing] Error cambiando plan empresa={}: {}", empresaId, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con la pasarela de pago"));
        }
    }
}
