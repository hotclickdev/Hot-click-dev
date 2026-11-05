package com.hotclick.controller;

import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.suscripcion.SolicitudCambioPlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Bajar de plan con la suscripción cobrada: la pyme manda una solicitud (no hay botón directo). Solo el PROPIETARIO
 * (o ADMIN de plataforma); un EDITOR recibe 403. No toca ONVO ni el plan.
 */
@RestController
@RequestMapping("/api/billing/solicitud-cambio-plan")
@PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN')")
public class SolicitudCambioPlanController {

    private final SolicitudCambioPlanService service;
    private final PropietarioGuard propietarioGuard;
    private final CompanyScope companyScope;

    public SolicitudCambioPlanController(SolicitudCambioPlanService service, PropietarioGuard propietarioGuard,
                                         CompanyScope companyScope) {
        this.service = service;
        this.propietarioGuard = propietarioGuard;
        this.companyScope = companyScope;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> solicitar(@RequestBody(required = false) Map<String, Object> body) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) {
            return ResponseEntity.status(403).body(Map.of("error", PropietarioGuard.MSG));
        }
        Long planId = null;
        String motivo = null;
        if (body != null) {
            Object p = body.get("planSolicitadoId");
            if (p instanceof Number n) planId = n.longValue();
            else if (p instanceof String s && s.matches("\\d{1,18}")) planId = Long.valueOf(s);
            if (body.get("motivo") instanceof String m) motivo = m;
        }
        try {
            return ResponseEntity.ok(service.solicitar(empresaId, companyScope.getCurrentUserId(), planId, motivo));
        } catch (SolicitudCambioPlanService.SolicitudInvalidaException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (SolicitudCambioPlanService.SolicitudAbiertaException e) {
            return ResponseEntity.status(409).body(Map.of("error", SolicitudCambioPlanService.SolicitudAbiertaException.MENSAJE,
                "codigo", "SOLICITUD_CAMBIO_PLAN_ABIERTA"));
        }
    }
}
