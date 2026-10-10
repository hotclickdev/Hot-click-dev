package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.consola.NegocioRapidoOnboardingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Pasos guiados del negocio asignado por enlace; la empresa siempre sale de la sesión. */
@RestController
@PreAuthorize("hasRole('EMPRENDEDOR')")
@RequestMapping("/api/emprendedor/negocio-rapido/onboarding")
public class NegocioRapidoOnboardingController {

    private final NegocioRapidoOnboardingService onboarding;
    private final CompanyScope companyScope;

    public NegocioRapidoOnboardingController(NegocioRapidoOnboardingService onboarding, CompanyScope companyScope) {
        this.onboarding = onboarding;
        this.companyScope = companyScope;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> estado() {
        return ResponseEntity.ok(ResponseDTO.success("Onboarding", onboarding.estado(companyScope.getCurrentEmpresaIdOrOwn())));
    }

    @PutMapping("/{paso}")
    public ResponseEntity<ResponseDTO> marcar(@PathVariable String paso, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ResponseDTO.success("Onboarding",
            onboarding.marcar(companyScope.getCurrentEmpresaIdOrOwn(), paso, body.get("accion"))));
    }
}
