package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.negocio.MensualidadNegocioService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * S4-24 (lectura): «Mi plan y mensualidad». Solo el propietario del negocio (el personal recibe 403).
 * El negocio sale del token. {@code POST /pago} es un esqueleto fail-closed hasta tener las llaves de ONVO.
 */
@RestController
@RequestMapping("/api/negocio/mensualidad")
@PreAuthorize("hasRole('EMPRENDEDOR')")
public class NegocioMensualidadController {

    private final MensualidadNegocioService service;
    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;

    public NegocioMensualidadController(MensualidadNegocioService service, CompanyScope companyScope,
                                        PropietarioGuard propietarioGuard) {
        this.service = service;
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
    }

    @GetMapping
    public ResponseEntity<?> mensualidad() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return error(HttpStatus.FORBIDDEN, "SOLO_PROPIETARIO", PropietarioGuard.MSG);
        return ResponseEntity.ok(ResponseDTO.success("Mensualidad", service.mensualidad(empresaId)));
    }

    /** → { url } del Checkout de ONVO. 409 PLAN_SIN_PRECIO · 503 ONVO_NO_CONFIGURADO (sin llaves, fail-closed). */
    @PostMapping("/pago")
    public ResponseEntity<?> pagar() {
        Long empresaId = companyScope.requireEmpresaId();
        if (!esPropietario(empresaId)) return error(HttpStatus.FORBIDDEN, "SOLO_PROPIETARIO", PropietarioGuard.MSG);
        try {
            return ResponseEntity.ok(ResponseDTO.success("Checkout de la mensualidad", service.pagar(empresaId)));
        } catch (MensualidadNegocioService.PlanSinPrecioException e) {
            return error(HttpStatus.CONFLICT, MensualidadNegocioService.CODIGO_PLAN_SIN_PRECIO, e.getMessage());
        } catch (com.hotclick.service.negocio.MensualidadCheckoutClient.NoConfiguradoException e) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, "ONVO_NO_CONFIGURADO", e.getMessage());
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
