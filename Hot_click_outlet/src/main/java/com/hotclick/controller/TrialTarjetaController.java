package com.hotclick.controller;

import com.hotclick.exception.CobroPlanNoDisponibleException;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.suscripcion.TrialTarjetaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Captura de la tarjeta durante el trial Emprendedor (ONVO). Solo el propietario; el negocio sale siempre del JWT
 * ({@link TenantContext}), nunca de la ruta ni del cuerpo, así que un negocio no puede apuntar a otro.
 */
@RestController
@RequestMapping("/api/billing/trial/tarjeta")
public class TrialTarjetaController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(TrialTarjetaController.class);

    private final TrialTarjetaService service;
    private final PropietarioGuard propietarioGuard;

    public TrialTarjetaController(TrialTarjetaService service, PropietarioGuard propietarioGuard) {
        this.service = service;
        this.propietarioGuard = propietarioGuard;
    }

    /** Estado para el panel: ¿puede agregar tarjeta?, ¿ya la guardó?, días de trial. */
    @GetMapping
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> estado() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario();
        try {
            TrialTarjetaService.Estado e = service.estado(empresaId);
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("elegible", e.elegible());
            out.put("tarjetaGuardada", e.tarjetaGuardada());
            out.put("trialDias", e.trialDias());
            return ResponseEntity.ok(out);
        } catch (TrialTarjetaService.VerificacionNoDisponibleException ex) {
            return verificacion();
        }
    }

    /** Prepara la suscripción del trial y devuelve lo que el SDK de ONVO necesita para confirmar la tarjeta. */
    @PostMapping
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> iniciar() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario();
        try {
            return ResponseEntity.ok(service.iniciar(empresaId));
        } catch (TrialTarjetaService.NoDisponibleException ex) {
            return ResponseEntity.status(409).body(Map.of(
                "error", TrialTarjetaService.NoDisponibleException.MENSAJE,
                "codigo", TrialTarjetaService.NoDisponibleException.CODIGO));
        } catch (CobroPlanNoDisponibleException ex) {
            return ResponseEntity.status(409).body(Map.of(
                "error", CobroPlanNoDisponibleException.MENSAJE,
                "codigo", CobroPlanNoDisponibleException.CODIGO));
        } catch (TrialTarjetaService.VerificacionNoDisponibleException ex) {
            return verificacion();
        } catch (RuntimeException ex) {
            log.error("[trial-tarjeta] error preparando la tarjeta empresa={}: {}", empresaId, ex.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Error con la pasarela de pago"));
        }
    }

    private static ResponseEntity<Map<String, Object>> verificacion() {
        return ResponseEntity.status(503).body(Map.of(
            "error", TrialTarjetaService.VerificacionNoDisponibleException.MENSAJE,
            "codigo", TrialTarjetaService.VerificacionNoDisponibleException.CODIGO));
    }

    private static ResponseEntity<Map<String, Object>> soloPropietario() {
        return ResponseEntity.status(403).body(Map.of("error", PropietarioGuard.MSG));
    }
}
