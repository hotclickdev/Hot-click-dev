package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.negocio.ContraEntregaNegocioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * S2 · Contra entrega por negocio. {@code GET/PUT /api/negocio/contra-entrega} → {@code {acepta, minimo}}.
 * El negocio sale del token; solo el propietario (el personal recibe 403 SOLO_PROPIETARIO).
 */
@RestController
@RequestMapping("/api/negocio/contra-entrega")
@PreAuthorize("hasRole('EMPRENDEDOR')")
public class NegocioContraEntregaController {

    private final ContraEntregaNegocioService service;
    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;

    public NegocioContraEntregaController(ContraEntregaNegocioService service, CompanyScope companyScope,
                                          PropietarioGuard propietarioGuard) {
        this.service = service;
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
    }

    @GetMapping
    public ResponseEntity<?> obtener() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return error(HttpStatus.FORBIDDEN, "SOLO_PROPIETARIO", PropietarioGuard.MSG);
        return ResponseEntity.ok(ResponseDTO.success("Contra entrega", service.obtener(empresaId)));
    }

    @PutMapping
    public ResponseEntity<?> guardar(@RequestBody(required = false) Map<String, Object> body) {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return error(HttpStatus.FORBIDDEN, "SOLO_PROPIETARIO", PropietarioGuard.MSG);
        try {
            return ResponseEntity.ok(ResponseDTO.success("Contra entrega guardada", service.guardar(empresaId, body)));
        } catch (ContraEntregaNegocioService.ConfigInvalidaException e) {
            return error(HttpStatus.BAD_REQUEST, e.getCodigo(), e.getMessage());
        }
    }

    private boolean esPropietario(Long empresaId) {
        return !companyScope.isImpersonating()
            && propietarioGuard.esPropietario(companyScope.getCurrentUser(), empresaId);
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("success", false);
        err.put("code", code);
        err.put("message", message);
        return ResponseEntity.status(status).body(err);
    }
}
