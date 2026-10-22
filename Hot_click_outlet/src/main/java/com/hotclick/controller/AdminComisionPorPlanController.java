package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.finanzas.ComisionPorPlanService;
import com.hotclick.utils.Constants;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/** S6-18: tablero de comisión cobrada por semana y por plan (solo admin de plataforma). */
@RestController
@RequestMapping("/api/admin/finanzas/comision-por-plan")
@PreAuthorize("hasRole('ADMIN')")
public class AdminComisionPorPlanController {

    private static final int SEMANAS_POR_DEFECTO = 8;

    private final ComisionPorPlanService service;

    public AdminComisionPorPlanController(ComisionPorPlanService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> obtener(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate fin = hasta != null ? hasta : LocalDate.now(Constants.ZONA_CR);
        LocalDate inicio = desde != null ? desde : fin.minusWeeks(SEMANAS_POR_DEFECTO);
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("desde", inicio.toString());
            data.put("hasta", fin.toString());
            data.put("moneda", "CRC");
            data.put("filas", service.calcular(inicio, fin));
            return ResponseEntity.ok(ResponseDTO.success("Comisión por plan", data));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
