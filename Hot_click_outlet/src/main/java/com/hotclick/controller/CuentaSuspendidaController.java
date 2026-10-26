package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.suscripcion.AdminSuspensionService;
import com.hotclick.service.suscripcion.SuscripcionOnvoChangeService;
import com.hotclick.service.suscripcion.SuspensionImpago;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Suscripción impaga (día 9+): lo único que ve el dueño suspendido. Cuenta, monto pendiente y pagar por ONVO.
 * El monto sale del plan impago en la tabla plan (precio_mensual), nunca de un valor fijo.
 */
@RestController
@RequestMapping("/api/billing/impago")
public class CuentaSuspendidaController {

    private static final Logger log = LoggerFactory.getLogger(CuentaSuspendidaController.class);
    static final String MSG_ERROR = "No pudimos iniciar el pago. Probá de nuevo en unos minutos.";

    private final EmpresaRepository empresaRepo;
    private final SuscripcionOnvoChangeService onvoChange;
    private final PropietarioGuard propietarioGuard;
    private final AuthSupport authSupport;
    private final AdminSuspensionService extensiones;

    public CuentaSuspendidaController(EmpresaRepository empresaRepo, SuscripcionOnvoChangeService onvoChange,
                                      PropietarioGuard propietarioGuard, AuthSupport authSupport,
                                      AdminSuspensionService extensiones) {
        this.extensiones = extensiones;
        this.empresaRepo = empresaRepo;
        this.onvoChange = onvoChange;
        this.propietarioGuard = propietarioGuard;
        this.authSupport = authSupport;
    }

    /** Datos de la cuenta y monto pendiente (CRC). Para una tienda activa responde suspendida=false. */
    @GetMapping
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> estado() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        Empresa e = empresaRepo.findById(empresaId).orElse(null);
        if (e == null) return ResponseEntity.notFound().build();
        Map<String, Object> out = new LinkedHashMap<>();
        boolean suspendida = SuspensionImpago.estaSuspendida(e.getEstadoEmpresa());
        out.put("suspendida", suspendida);
        out.put("nombreEmpresa", e.getNombreEmpresa());
        out.put("correoEmpresa", e.getCorreoEmpresa());
        out.put("fechaVencPlan", e.getFechaVencPlan());
        boolean enExtension = SuspensionImpago.enExtension(e.getEstadoEmpresa());
        out.put("enExtension", enExtension);
        if (enExtension) {
            extensiones.extensionVigente(empresaId).ifPresent(x -> out.put("extensionVenceEn", x.getVenceEn()));
        }
        if (suspendida) {
            onvoChange.planPendienteDeSuspension(empresaId).ifPresent((Plan p) -> {
                out.put("planPendiente", p.getNombre());
                out.put("montoPendiente", p.getPrecioMensual());
                out.put("moneda", "CRC");
            });
        }
        return ResponseEntity.ok(out);
    }

    /** Extensión de admin: pedidos creados en la gracia que el dueño todavía puede gestionar. Vacío fuera de la extensión. */
    @GetMapping("/pedidos")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> pedidosDeGracia() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(extensiones.pedidosDeGracia(empresaId));
    }

    /** Inicia el cobro ONVO del plan impago. La tienda vuelve a ACTIVO solo con el webhook ONVO verificado. */
    @PostMapping("/pagar")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> pagar(HttpServletRequest request) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) {
            return ResponseEntity.status(403).body(Map.of("error", PropietarioGuard.MSG));
        }
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            if (!Boolean.TRUE.equals(usuario.getCorreoVerificado())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Verificá tu correo antes de pagar"));
            }
            Map<String, Object> out = new LinkedHashMap<>(onvoChange.pagarSuspension(empresaId));
            out.putIfAbsent("proveedor", "ONVO");
            return ResponseEntity.ok(out);
        } catch (IllegalArgumentException | IllegalStateException | java.util.NoSuchElementException ex) {
            return ResponseEntity.status(409).body(Map.of("error", MSG_ERROR));
        } catch (SecurityException ex) {
            return ResponseEntity.status(401).body(Map.of("error", "Tu sesión no es válida. Volvé a iniciar sesión."));
        } catch (Exception ex) {
            log.error("[billing] Error iniciando pago de suspensión empresa={}: {}", empresaId, ex.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", MSG_ERROR));
        }
    }
}
