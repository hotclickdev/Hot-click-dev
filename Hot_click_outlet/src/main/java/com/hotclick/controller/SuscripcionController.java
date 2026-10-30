package com.hotclick.controller;

import com.hotclick.model.Plan;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.auth.AuthSupport;
import com.stripe.exception.StripeException;
import jakarta.servlet.http.HttpServletRequest;
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
    private final AuthSupport authSupport;
    private final com.hotclick.service.suscripcion.SuscripcionTilopayService suscripcionTilopayService;
    private final com.hotclick.service.suscripcion.PreciosPlanesConfig preciosPlanes;
    private final com.hotclick.security.PropietarioGuard propietarioGuard;

    public SuscripcionController(SuscripcionService suscripcionService,
                                  PlanRepository planRepo,
                                  AuthSupport authSupport,
                                  com.hotclick.service.suscripcion.SuscripcionTilopayService suscripcionTilopayService,
                                  com.hotclick.service.suscripcion.PreciosPlanesConfig preciosPlanes,
                                  com.hotclick.security.PropietarioGuard propietarioGuard) {
        this.preciosPlanes = preciosPlanes;
        this.propietarioGuard = propietarioGuard;
        this.suscripcionTilopayService = suscripcionTilopayService;
        this.suscripcionService = suscripcionService;
        this.planRepo           = planRepo;
        this.authSupport        = authSupport;
    }

    /** Lista todos los planes disponibles (públicos). */
    @GetMapping("/planes")
    public ResponseEntity<?> listarPlanes() {
        List<Plan> planes = planRepo.findByActivoTrueOrderByPrecioMensualAsc();
        // Sin precio configurado no se publica el plan con 0 ni con valores viejos: 409 PLAN_SIN_PRECIO.
        for (Plan p : planes) {
            if (preciosPlanes.precioUsd(p.getNombre()).filter(v -> v.signum() > 0).isEmpty()) return planSinPrecio(new com.hotclick.exception.PlanSinPrecioException(p.getNombre()));
        }
        List<Map<String, Object>> result = planes.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("nombre", p.getNombre());
            m.put("descripcion", p.getDescripcion());
            // precioMensual en colones (UI / cobro ONVO). precioUsd es legado.
            m.put("precioMensual", p.getPrecioMensual());
            m.put("precioUsd", preciosPlanes.requerir(p.getNombre()));
            m.put("comisionPorcentaje", p.getComisionPorcentaje());
            m.put("comisionMinimaCrc", 0); // V185: sin mínimo por venta
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
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA2-área2
        return ResponseEntity.ok(suscripcionService.getSuscripcionInfo(empresaId));
    }

    /** Historial de facturas SaaS de la empresa. */
    @GetMapping("/facturas")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getFacturas(
            @RequestParam(defaultValue = "0") int pagina) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA2-área2
        return ResponseEntity.ok(suscripcionService.getFacturas(empresaId, pagina));
    }

    /** Inicia trial de 14 días para la empresa (solo si no tiene suscripción activa). */
    @PostMapping("/trial")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> iniciarTrial() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA3-012
        suscripcionService.iniciarTrial(empresaId);
        return ResponseEntity.ok(Map.of("status", "ok", "mensaje", "Trial iniciado por 14 días"));
    }

    /**
     * Checkout de plan. Auditor 5 S-01: el cobro de mensualidades va por ONVO (mismo flujo que
     * /cambiar-plan); Tilopay quedó sin cobro recurrente, así que ya no se ofrece por aquí.
     */
    @PostMapping("/checkout/{planId}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> crearCheckout(@PathVariable Long planId, HttpServletRequest request) {
        return cambiarPlan(planId, request);
    }

    /** Genera URL del Customer Portal de Stripe (auto-gestión de pago/facturación). */
    @PostMapping("/portal")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> crearPortal() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA3-012
        try {
            String url = suscripcionService.crearPortalUrl(empresaId);
            return ResponseEntity.ok(Map.of("portalUrl", url));
        } catch (StripeException e) {
            log.error("[billing] Error creando portal empresa={}: {}", empresaId, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con Stripe"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", MSG_SOLICITUD));
        }
    }

    /** Cancela la suscripción activa (al final del período por defecto). */
    @PostMapping("/cancelar")
    @PreAuthorize("hasRole('EMPRENDEDOR')")
    public ResponseEntity<Map<String, Object>> cancelar(
            @RequestParam(defaultValue = "false") boolean inmediata) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA3-012
        try {
            suscripcionService.cancelar(empresaId, inmediata);
            return ResponseEntity.ok(Map.of("status", "ok",
                "mensaje", inmediata ? "Suscripción cancelada" : "Se cancelará al vencer el período"));
        } catch (StripeException e) {
            log.error("[billing] Error cancelando empresa={}: {}", empresaId, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con Stripe"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.badRequest().body(Map.of("error", MSG_SOLICITUD));
        }
    }

    /**
     * Correo verificado obligatorio: planes de pago y también Emprendedor, cuyo trial y mensualidad por ONVO ocupan un
     * puesto del cupo (antes solo se exigía si el precio en colones era > 0 y Emprendedor se colaba sin verificar).
     */
    static boolean exigeCorreoVerificado(Plan plan) {
        if (plan == null) return false;
        boolean planPago = plan.getPrecioMensual() != null && plan.getPrecioMensual() > 0;
        return planPago || "EMPRENDEDOR".equalsIgnoreCase(plan.getNombre());
    }

    /**
     * Cambia el plan SaaS vía ONVO (self-service).
     * No activa el plan local hasta el webhook (salvo mock).
     */
    @PostMapping("/cambiar-plan/{planId}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> cambiarPlan(@PathVariable Long planId, HttpServletRequest request) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        // QA3-012: solo el PROPIETARIO (o ADMIN de plataforma) cambia el plan; un EDITOR recibe 403
        // antes de tocar precios, límites o cobro.
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA3-012
        try {
            Plan plan = planRepo.findById(planId).orElse(null);
            if (plan != null) preciosPlanes.requerir(plan.getNombre());
            if (exigeCorreoVerificado(plan)) {
                Usuario usuario = authSupport.usuarioFromRequest(request);
                if (!Boolean.TRUE.equals(usuario.getCorreoVerificado())) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Verificá tu correo antes de activar un plan de pago"));
                }
            }
            // Auditor 5 S-01: alta/cambio por ONVO (fail-closed sin llave). El plan local solo cambia
            // cuando el webhook de billing verifica el cobro contra ONVO (S-02/S-06).
            Map<String, Object> out = new java.util.LinkedHashMap<>(suscripcionService.cambiarPlanOnvo(empresaId, planId));
            out.putIfAbsent("proveedor", "ONVO");
            return ResponseEntity.ok(out);
        } catch (com.hotclick.exception.EmpresaPendienteAprobacionException e) {
            return ResponseEntity.status(409).body(Map.of(
                "error", com.hotclick.exception.EmpresaPendienteAprobacionException.MENSAJE,
                "codigo", com.hotclick.exception.EmpresaPendienteAprobacionException.CODIGO));
        } catch (com.hotclick.exception.PlanSinPrecioException e) {
            return planSinPrecio(e);
        } catch (com.hotclick.exception.CobroPlanNoDisponibleException e) {
            return cobroNoDisponible();
        } catch (com.hotclick.exception.AltaOnvoEnCursoException e) {
            return ResponseEntity.status(409).body(Map.of(
                "error", com.hotclick.exception.AltaOnvoEnCursoException.MENSAJE,
                "codigo", com.hotclick.exception.AltaOnvoEnCursoException.CODIGO));
        } catch (com.hotclick.exception.PlanNoDisponibleException e) {
            return ResponseEntity.status(409).body(Map.of("error", com.hotclick.exception.PlanNoDisponibleException.MENSAJE, "codigo", "PLAN_SIN_PRECIO"));
        } catch (IllegalArgumentException | IllegalStateException | NoSuchElementException e) {
            return ResponseEntity.badRequest().body(Map.of("error", MSG_SOLICITUD));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("error", MSG_SESION));
        } catch (Exception e) {
            log.error("[billing] Error cambiando plan empresa={}: {}", empresaId, e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con la pasarela de pago"));
        }
    }

    /** Confirma con Tilopay el cobro de mensualidad (alta o renovación) del propio negocio. */
    @PostMapping("/tilopay/confirmar/{orderNumber}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> confirmarTilopay(@PathVariable String orderNumber) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA2-área2
        try {
            return ResponseEntity.ok(suscripcionTilopayService.confirmar(empresaId, orderNumber));
        } catch (com.hotclick.exception.CobroPlanNoDisponibleException e) {
            return cobroNoDisponible();
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Cobro no encontrado"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", MSG_COBRO));
        }
    }

    /** Mensualidad pendiente (renovación) para pagar desde el panel. */
    @GetMapping("/tilopay/pendiente")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> cobroPendiente() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA2-área2
        try {
            return suscripcionTilopayService.pendiente(empresaId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
        } catch (com.hotclick.exception.CobroPlanNoDisponibleException e) {
            return cobroNoDisponible();
        }
    }

    /** Plan nuevo elegido sin pagar: el panel muestra «Completá el pago» (204 si no hay). */
    @GetMapping("/plan-pendiente")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> planPendiente() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA2-área2
        return suscripcionTilopayService.planNuevoPendiente(empresaId)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Mensajes genéricos: las respuestas 4xx nunca exponen e.getMessage(). */
    static final String MSG_SOLICITUD = "No pudimos procesar la solicitud. Revisá los datos y probá de nuevo.";
    static final String MSG_SESION = "Tu sesión no es válida. Volvé a iniciar sesión.";
    static final String MSG_COBRO = "No pudimos confirmar el cobro todavía. Probá de nuevo en unos minutos.";

    private static <T> ResponseEntity<T> cobroNoDisponible() {
        @SuppressWarnings("unchecked")
        T body = (T) Map.of("error", com.hotclick.exception.CobroPlanNoDisponibleException.MENSAJE,
            "codigo", com.hotclick.exception.CobroPlanNoDisponibleException.CODIGO);
        return ResponseEntity.status(409).body(body);
    }

    private static <T> ResponseEntity<T> planSinPrecio(com.hotclick.exception.PlanSinPrecioException e) {
        @SuppressWarnings("unchecked")
        T body = (T) Map.of("error", com.hotclick.exception.PlanSinPrecioException.MENSAJE, "codigo", com.hotclick.exception.PlanSinPrecioException.CODIGO, "plan", e.getPlan());
        return ResponseEntity.status(409).body(body);
    }

    private static <T> ResponseEntity<T> soloPropietario() {
        @SuppressWarnings("unchecked")
        T body = (T) Map.of("error", com.hotclick.security.PropietarioGuard.MSG);
        return ResponseEntity.status(403).body(body);
    }
}
