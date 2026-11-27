package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.fiscal.fec.FecModelos.Reporte;
import com.hotclick.service.fiscal.fec.FecPeriodo;
import com.hotclick.service.fiscal.fec.FecService;
import com.hotclick.utils.Constants;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/** Generación manual de las FEC de una quincena cerrada. Solo ADMIN; sin efecto con la FEC apagada. */
@RestController
public class AdminFecController {

    private final FecService fec;
    private final AuditoriaAdminRegistroService auditoria;

    public AdminFecController(FecService fec, AuditoriaAdminRegistroService auditoria) {
        this.fec = fec;
        this.auditoria = auditoria;
    }

    @PostMapping("/api/admin/fiscal/fec/generar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> generar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        FecPeriodo periodo;
        try {
            periodo = FecPeriodo.cerrada(desde, hasta, LocalDate.now(Constants.ZONA_CR));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
        Reporte r = fec.generar(periodo);
        auditoria.registrar("FEC_GENERAR", "FEC", 0L, null,
            "periodo " + periodo.desde() + " a " + periodo.hasta() + ", activa " + r.activa()
                + ", items " + r.items().size());
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("activa", r.activa());
        d.put("mensaje", r.mensaje());
        d.put("desde", periodo.desde());
        d.put("hasta", periodo.hasta());
        d.put("items", r.items());
        return ResponseEntity.ok(ResponseDTO.success(r.mensaje(), d));
    }
}
