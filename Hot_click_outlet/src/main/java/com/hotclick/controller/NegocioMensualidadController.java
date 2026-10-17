package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.negocio.MensualidadNegocioService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * S4-24 (lectura): «Mi plan y mensualidad». Solo el propietario del negocio (el personal recibe 403).
 * El negocio sale del token. El pago ({@code POST /pago}) necesita el Checkout de ONVO y queda fuera.
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
    public ResponseEntity<ResponseDTO> mensualidad() {
        Long empresaId = companyScope.requireEmpresaId();
        propietarioGuard.exigirPropietario(empresaId);
        return ResponseEntity.ok(ResponseDTO.success("Mensualidad", service.mensualidad(empresaId)));
    }
}
