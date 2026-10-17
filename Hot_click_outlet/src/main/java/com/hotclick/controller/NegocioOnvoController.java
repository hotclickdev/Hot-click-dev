package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.onvo.CuentaOnvoNegocioService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * S3-11 / S3-15 (lectura): cuenta ONVO del propio negocio. Solo el propietario (el personal recibe 403).
 * Nunca devuelve IBAN, KYC ni enlaces de onboarding.
 */
@RestController
@RequestMapping({"/api/negocio/onvo", "/api/empresa/onvo"})
@PreAuthorize("hasRole('EMPRENDEDOR')")
public class NegocioOnvoController {

    private final CuentaOnvoNegocioService service;
    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;
    private final com.hotclick.service.onvo.OnvoOnboardingService onboarding;

    public NegocioOnvoController(CuentaOnvoNegocioService service, CompanyScope companyScope,
                                 PropietarioGuard propietarioGuard,
                                 com.hotclick.service.onvo.OnvoOnboardingService onboarding) {
        this.service = service;
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
        this.onboarding = onboarding;
    }

    /** S3-07: crea la cuenta en ONVO → { url } de onboarding. 409 CUENTA_YA_EXISTE · 503 ONVO_NO_CONFIGURADO. */
    @PostMapping("/activar")
    public ResponseEntity<?> activar() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return soloPropietario();
        return OnvoRespuestas.ejecutar(() -> ResponseEntity.ok(ResponseDTO.success("Cuenta ONVO creada",
            onboarding.activar(empresaId, companyScope.getCurrentUserId()))));
    }

    /** S3-08: enlace vigente para «Continuar en ONVO». 409 SIN_CUENTA_ONVO · 503 ONVO_NO_CONFIGURADO. */
    @PostMapping("/enlace")
    public ResponseEntity<?> enlace() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return soloPropietario();
        return OnvoRespuestas.ejecutar(() -> ResponseEntity.ok(ResponseDTO.success("Enlace de ONVO",
            onboarding.enlace(empresaId))));
    }

    /** S3-08: reenvía el enlace al correo del negocio → 204. 409 SIN_CUENTA_ONVO · 503 ONVO_NO_CONFIGURADO. */
    @PostMapping("/reenviar-enlace")
    public ResponseEntity<?> reenviarEnlace() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return soloPropietario();
        return OnvoRespuestas.ejecutar(() -> {
            onboarding.reenviarEnlace(empresaId);
            return ResponseEntity.noContent().build();
        });
    }

    @GetMapping("/estado")
    public ResponseEntity<?> estado() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return soloPropietario();
        return ResponseEntity.ok(ResponseDTO.success("Cuenta ONVO", service.estado(empresaId)));
    }

    @GetMapping("/frecuencia")
    public ResponseEntity<?> frecuencia() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return soloPropietario();
        return ResponseEntity.ok(ResponseDTO.success("Frecuencia de liquidación", service.frecuencia(empresaId)));
    }

    @PutMapping("/frecuencia")
    public ResponseEntity<?> cambiarFrecuencia(@RequestBody(required = false) Map<String, Object> body) {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return soloPropietario();
        try {
            Object valor = body != null ? body.get("frecuencia") : null;
            return ResponseEntity.ok(ResponseDTO.success("Frecuencia guardada",
                service.cambiarFrecuencia(empresaId, valor, companyScope.getCurrentUserId())));
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new java.util.LinkedHashMap<>();
            err.put("success", false);
            err.put("code", CuentaOnvoNegocioService.CODIGO_FRECUENCIA_INVALIDA);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /** Código estable del 403 para el personal del negocio (Frontend). */
    public static final String CODIGO_SOLO_PROPIETARIO = "SOLO_PROPIETARIO";

    private boolean esPropietario(Long empresaId) {
        return !companyScope.isImpersonating()
            && propietarioGuard.esPropietario(companyScope.getCurrentUser(), empresaId);
    }

    static ResponseEntity<Map<String, Object>> soloPropietario() {
        Map<String, Object> err = new java.util.LinkedHashMap<>();
        err.put("success", false);
        err.put("code", CODIGO_SOLO_PROPIETARIO);
        err.put("message", PropietarioGuard.MSG);
        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(err);
    }
}
