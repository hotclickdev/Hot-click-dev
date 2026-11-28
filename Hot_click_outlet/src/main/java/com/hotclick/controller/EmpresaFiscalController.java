package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.fiscal.DeclararSituacionRequest;
import com.hotclick.dto.fiscal.InscripcionFiscalRequest;
import com.hotclick.exception.EmpresaRequeridaException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.fiscal.EmpresaFiscalService;
import com.hotclick.service.fiscal.LimiteIntentosFiscalException;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Situación fiscal del negocio del vendedor y comisión efectiva. La empresa sale siempre de la sesión
 * (CompanyScope); el cuerpo no puede nombrar otra. Escritura solo del propietario (o ADMIN de plataforma).
 */
@RestController
@RequestMapping("/api/empresa/fiscal")
public class EmpresaFiscalController {

    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;
    private final EmpresaFiscalService fiscal;

    public EmpresaFiscalController(CompanyScope companyScope, PropietarioGuard propietarioGuard,
                                   EmpresaFiscalService fiscal) {
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
        this.fiscal = fiscal;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> obtener() {
        Long empresaId = companyScope.requireEmpresaId();
        return ResponseEntity.ok(ResponseDTO.success("Situación fiscal", fiscal.obtener(empresaId)));
    }

    @PutMapping("/situacion")
    public ResponseEntity<ResponseDTO> declarar(@Valid @RequestBody DeclararSituacionRequest body) {
        Long empresaId = companyScope.requireEmpresaId();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario();
        try {
            return ResponseEntity.ok(ResponseDTO.success("Situación fiscal guardada",
                fiscal.declarar(empresaId, body.situacion())));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/inscripcion")
    public ResponseEntity<ResponseDTO> inscripcion(@Valid @RequestBody InscripcionFiscalRequest body) {
        Long empresaId = companyScope.requireEmpresaId();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario();
        try {
            Map<String, Object> data = fiscal.registrarInscripcion(empresaId, new EmpresaFiscalService.Inscripcion(
                body.situacion(), body.cedula(), body.nombre(), body.actividad(), body.correo(),
                Boolean.TRUE.equals(body.aceptaDeclaracion())));
            return ResponseEntity.ok(ResponseDTO.success("Inscripción registrada", data));
        } catch (LimiteIntentosFiscalException e) {
            return ResponseEntity.status(429).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    private static ResponseEntity<ResponseDTO> soloPropietario() {
        return ResponseEntity.status(403).body(ResponseDTO.error("Solo el propietario del negocio puede cambiar esto."));
    }
}
