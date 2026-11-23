package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.alta.AltaFasesService;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Panel del dueño: fase del alta y enlace a ONVO. La empresa sale SIEMPRE del token ({@link CompanyScope}); no hay id
 * en la ruta, así que un negocio no puede consultar ni accionar a otro (sin IDOR). El enlace de ONVO es solo del
 * propietario (o ADMIN de plataforma); el estado lo puede ver todo el equipo.
 */
@RestController
@RequestMapping("/api/empresa/alta-negocio")
public class AltaNegocioController {

    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;
    private final AltaFasesService altaFases;
    private final CuentaOnvoService cuentaOnvoService;

    public AltaNegocioController(CompanyScope companyScope, PropietarioGuard propietarioGuard,
                                 AltaFasesService altaFases, CuentaOnvoService cuentaOnvoService) {
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
        this.altaFases = altaFases;
        this.cuentaOnvoService = cuentaOnvoService;
    }

    @GetMapping("/estado")
    public ResponseEntity<ResponseDTO> estado() {
        Long empresaId = companyScope.requireEmpresaId();
        return ResponseEntity.ok(ResponseDTO.success("Estado del alta", altaFases.estadoDe(empresaId)));
    }

    /** Regenera el enlace si venció. {@code url} viene vacío si no hay enlace (cuenta activa, ONVO no disponible, etc.). */
    @PostMapping("/onvo-enlace")
    public ResponseEntity<ResponseDTO> enlaceOnvo() {
        Long empresaId = companyScope.requireEmpresaId();
        propietarioGuard.exigirGestionEmpresa(empresaId);
        Map<String, Object> data = new HashMap<>();
        var url = cuentaOnvoService.onboardingUrlParaDueno(empresaId);
        data.put("url", url.orElse(null));
        data.put("mensaje", url.isPresent() ? "Enlace listo." :
            "Por ahora no hay un enlace disponible. Intente de nuevo en unos minutos o escriba a soporte de HotClick.");
        return ResponseEntity.ok(ResponseDTO.success("Enlace de ONVO", data));
    }
}
