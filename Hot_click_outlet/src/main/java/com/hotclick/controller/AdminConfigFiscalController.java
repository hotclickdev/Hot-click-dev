package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.fiscal.ReglasFiscalesRequest;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService.Fec;
import com.hotclick.service.fiscal.ConfiguracionFiscalService.Reglas;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/** Reglas fiscales de la plataforma (régimen de HotClick, extra por no inscrito, plazos y datos de ONVO). Solo ADMIN. */
@RestController
public class AdminConfigFiscalController {

    private final ConfiguracionFiscalService config;
    private final AuditoriaAdminRegistroService auditoria;

    public AdminConfigFiscalController(ConfiguracionFiscalService config, AuditoriaAdminRegistroService auditoria) {
        this.config = config;
        this.auditoria = auditoria;
    }

    @GetMapping("/api/admin/configuracion/fiscal")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> obtener() {
        return ResponseEntity.ok(ResponseDTO.success("Reglas fiscales", datos(config.reglas(), config.fec())));
    }

    @PutMapping("/api/admin/configuracion/fiscal")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> actualizar(@Valid @RequestBody ReglasFiscalesRequest body) {
        Reglas anterior = config.reglas();
        Reglas nuevas;
        try {
            nuevas = config.actualizar(new Reglas(body.regimen(), body.extraNoInscritoPct(), body.diasEnviarFactura(),
                body.onvoPagoMinimoCrc(), body.onvoCostoPagoCrc()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Revisá los valores de las reglas fiscales."));
        }
        Fec fecAnterior = config.fec();
        Fec fecNueva = config.actualizarFec(nuevas.regimen(), new Fec(
            body.fecHabilitada() != null ? body.fecHabilitada() : fecAnterior.habilitada(),
            body.fecPermitirNoInscrito() != null ? body.fecPermitirNoInscrito() : fecAnterior.permitirNoInscrito()));
        auditoria.registrar("REGLAS_FISCALES_ACTUALIZADAS", "CONFIG_FISCAL", 1L, null,
            "regimen " + anterior.regimen() + "->" + nuevas.regimen()
                + ", extra " + anterior.extraNoInscritoPct() + "->" + nuevas.extraNoInscritoPct()
                + ", dias " + anterior.diasEnviarFactura() + "->" + nuevas.diasEnviarFactura()
                + ", fec " + fecAnterior.habilitada() + "->" + fecNueva.habilitada()
                + ", fecNoInscrito " + fecAnterior.permitirNoInscrito() + "->" + fecNueva.permitirNoInscrito());
        return ResponseEntity.ok(ResponseDTO.success("Reglas fiscales actualizadas", datos(nuevas, fecNueva)));
    }

    private static Map<String, Object> datos(Reglas r, Fec fec) {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("regimen", r.regimen());
        d.put("extraNoInscritoPct", r.extraNoInscritoPct());
        d.put("diasEnviarFactura", r.diasEnviarFactura());
        d.put("onvoPagoMinimoCrc", r.onvoPagoMinimoCrc());
        d.put("onvoCostoPagoCrc", r.onvoCostoPagoCrc());
        d.put("fecHabilitada", fec.habilitada());
        d.put("fecPermitirNoInscrito", fec.permitirNoInscrito());
        d.put("fecActiva", ConfiguracionFiscalService.activa(r.regimen(), fec));
        return d;
    }
}
