package com.hotclick.controller;

import com.hotclick.dto.MetodoCobroCreateRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.MetodoCobroCambioService;
import com.hotclick.service.MetodoCobroService;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/metodos-cobro")
public class MetodoCobroController {

    private final MetodoCobroService metodoCobroService;
    private final MetodoCobroCambioService metodoCobroCambioService;
    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;

    public MetodoCobroController(
            MetodoCobroService metodoCobroService,
            MetodoCobroCambioService metodoCobroCambioService,
            CompanyScope companyScope,
            PropietarioGuard propietarioGuard) {
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
        this.metodoCobroService = metodoCobroService;
        this.metodoCobroCambioService = metodoCobroCambioService;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        if (!puedeGestionar()) return soloPropietario(); // QA2-área2: datos bancarios
        return ResponseEntity.ok(ResponseDTO.success("Métodos de cobro", metodoCobroService.listar()));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@Valid @RequestBody MetodoCobroCreateRequest req) {
        if (!puedeGestionar()) return soloPropietario(); // A2
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.success("Método de cobro guardado", metodoCobroService.crear(req)));
    }

    @PutMapping("/{id}/predeterminado")
    public ResponseEntity<ResponseDTO> marcarPredeterminado(@PathVariable Long id) {
        if (!puedeGestionar()) return soloPropietario(); // A2
        return ResponseEntity.ok(
                ResponseDTO.success("Método predeterminado actualizado", metodoCobroService.marcarPredeterminado(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> solicitarCambio(
            @PathVariable Long id,
            @Valid @RequestBody MetodoCobroCreateRequest req) {
        if (!puedeGestionar()) return soloPropietario(); // A2
        return ResponseEntity.ok(ResponseDTO.success(
                "Cambio enviado a revisión", metodoCobroCambioService.solicitarCambio(id, req)));
    }

    /** A2: LECTOR/EDITOR llevan rol Spring EMPRENDEDOR; cambiar dónde se cobra es solo del PROPIETARIO o ADMIN. */
    private boolean puedeGestionar() {
        return propietarioGuard.puedeGestionarEmpresa(companyScope.getCurrentEmpresaIdOrOwn());
    }

    private static ResponseEntity<ResponseDTO> soloPropietario() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error(PropietarioGuard.MSG));
    }
}
