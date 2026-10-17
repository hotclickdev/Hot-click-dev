package com.hotclick.controller;

import com.hotclick.dto.MetodoCobroCreateRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.MetodoCobroCambioService;
import com.hotclick.service.MetodoCobroService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/metodos-cobro")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
public class MetodoCobroController {

    private final MetodoCobroService metodoCobroService;
    private final MetodoCobroCambioService metodoCobroCambioService;
    private final com.hotclick.security.PropietarioGuard propietarioGuard;
    private final com.hotclick.security.CompanyScope companyScope;

    public MetodoCobroController(
            MetodoCobroService metodoCobroService,
            MetodoCobroCambioService metodoCobroCambioService,
            com.hotclick.security.PropietarioGuard propietarioGuard,
            com.hotclick.security.CompanyScope companyScope) {
        this.metodoCobroService = metodoCobroService;
        this.metodoCobroCambioService = metodoCobroCambioService;
        this.propietarioGuard = propietarioGuard;
        this.companyScope = companyScope;
    }

    /** La cuenta SINPE/IBAN donde cae la plata solo la toca el propietario del negocio. */
    private void exigirPropietario() {
        propietarioGuard.exigirPropietario(companyScope.getCurrentEmpresaIdOrOwn());
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Métodos de cobro", metodoCobroService.listar()));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@Valid @RequestBody MetodoCobroCreateRequest req) {
        exigirPropietario();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.success("Método de cobro guardado", metodoCobroService.crear(req)));
    }

    @PutMapping("/{id}/predeterminado")
    public ResponseEntity<ResponseDTO> marcarPredeterminado(@PathVariable Long id) {
        exigirPropietario();
        return ResponseEntity.ok(
                ResponseDTO.success("Método predeterminado actualizado", metodoCobroService.marcarPredeterminado(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> solicitarCambio(
            @PathVariable Long id,
            @Valid @RequestBody MetodoCobroCreateRequest req) {
        exigirPropietario();
        return ResponseEntity.ok(ResponseDTO.success(
                "Cambio enviado a revisión", metodoCobroCambioService.solicitarCambio(id, req)));
    }
}
