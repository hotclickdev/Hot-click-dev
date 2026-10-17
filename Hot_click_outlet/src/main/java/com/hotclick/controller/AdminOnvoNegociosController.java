package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.onvo.AdminOnvoNegociosService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * S2-29 / S3-22 (lectura): admin de cuentas ONVO de los negocios. Solo admin de plataforma.
 * Pausar/reanudar cobros sigue en {@code PUT /api/admin/empresas/{id}/cobros-pausados}.
 */
@RestController
@RequestMapping({"/api/admin/onvo/negocios", "/api/plataforma/onvo/negocios"})
@PreAuthorize("hasRole('ADMIN')")
public class AdminOnvoNegociosController {

    private final AdminOnvoNegociosService service;
    private final com.hotclick.service.onvo.OnvoOnboardingService onboarding;
    private final com.hotclick.security.CompanyScope companyScope;

    public AdminOnvoNegociosController(AdminOnvoNegociosService service,
                                       com.hotclick.service.onvo.OnvoOnboardingService onboarding,
                                       com.hotclick.security.CompanyScope companyScope) {
        this.service = service;
        this.onboarding = onboarding;
        this.companyScope = companyScope;
    }

    /** Registrar el negocio en ONVO → 204. 409 CUENTA_YA_EXISTE · 503 ONVO_NO_CONFIGURADO. */
    @PostMapping("/{id}/registrar")
    public ResponseEntity<?> registrar(@PathVariable Long id) {
        return OnvoRespuestas.ejecutar(() -> {
            onboarding.activar(id, companyScope.getCurrentUserId());
            return ResponseEntity.noContent().build();
        });
    }

    /** → 204. 409 SIN_CUENTA_ONVO · 503 ONVO_NO_CONFIGURADO. */
    @PostMapping("/{id}/reenviar-enlace")
    public ResponseEntity<?> reenviarEnlace(@PathVariable Long id) {
        return OnvoRespuestas.ejecutar(() -> {
            onboarding.reenviarEnlace(id);
            return ResponseEntity.noContent().build();
        });
    }

    /** Comisión ONVO del negocio { porcentaje } 0–100 → 204. 400 PORCENTAJE_INVALIDO. Auditado. */
    @PutMapping("/{id}/comision")
    public ResponseEntity<?> comision(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        try {
            onboarding.cambiarComision(id, body != null ? body.get("porcentaje") : null, companyScope.getCurrentUserId());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return OnvoRespuestas.error(org.springframework.http.HttpStatus.BAD_REQUEST,
                com.hotclick.service.onvo.OnvoOnboardingService.CODIGO_PORCENTAJE_INVALIDO, e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> listar(@RequestParam(required = false) String estado,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "50") int size) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Negocios ONVO", service.listar(estado, page, size)));
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("success", false);
            err.put("code", AdminOnvoNegociosService.CODIGO_ESTADO_INVALIDO);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Negocio ONVO", service.detalle(id)));
    }
}
