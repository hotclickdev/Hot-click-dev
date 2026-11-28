package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** El negocio ve solo sus enlaces de pago abiertos: la empresa sale de la sesión, nunca del cliente. */
@RestController
@RequestMapping("/api/empresa/enlaces-pago")
public class EmpresaEnlacePagoController {

    public record AvisoEnlace(Long id, int montoCrc, String motivo, String url) {}

    private final CompanyScope companyScope;
    private final EnlacePagoOnvoService enlaces;

    public EmpresaEnlacePagoController(CompanyScope companyScope, EnlacePagoOnvoService enlaces) {
        this.companyScope = companyScope;
        this.enlaces = enlaces;
    }

    @GetMapping("/abiertos")
    public ResponseEntity<ResponseDTO> abiertos() {
        Long empresaId = companyScope.requireEmpresaId();
        List<AvisoEnlace> l = enlaces.abiertosDe(empresaId).stream()
            .map(e -> new AvisoEnlace(e.getId(), e.getMontoCrc(), e.getMotivo(), e.getUrl())).toList();
        return ResponseEntity.ok(ResponseDTO.success("Enlaces de pago abiertos", l));
    }
}
