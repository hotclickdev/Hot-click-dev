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

    public NegocioOnvoController(CuentaOnvoNegocioService service, CompanyScope companyScope,
                                 PropietarioGuard propietarioGuard) {
        this.service = service;
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
    }

    @GetMapping("/estado")
    public ResponseEntity<ResponseDTO> estado() {
        Long empresaId = propio();
        return ResponseEntity.ok(ResponseDTO.success("Cuenta ONVO", service.estado(empresaId)));
    }

    @GetMapping("/frecuencia")
    public ResponseEntity<ResponseDTO> frecuencia() {
        Long empresaId = propio();
        return ResponseEntity.ok(ResponseDTO.success("Frecuencia de liquidación", service.frecuencia(empresaId)));
    }

    @PutMapping("/frecuencia")
    public ResponseEntity<?> cambiarFrecuencia(@RequestBody(required = false) Map<String, Object> body) {
        Long empresaId = propio();
        try {
            Object valor = body != null ? body.get("frecuencia") : null;
            return ResponseEntity.ok(ResponseDTO.success("Frecuencia guardada",
                service.cambiarFrecuencia(empresaId, valor, companyScope.getCurrentUserId())));
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new java.util.LinkedHashMap<>();
            err.put("success", false);
            err.put("code", "FRECUENCIA_INVALIDA");
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    private Long propio() {
        Long empresaId = companyScope.requireEmpresaId();
        propietarioGuard.exigirPropietario(empresaId);
        return empresaId;
    }
}
