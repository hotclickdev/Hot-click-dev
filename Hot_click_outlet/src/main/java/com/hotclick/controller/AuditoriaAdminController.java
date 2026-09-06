package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.AuditoriaAdminConsultaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

/**
 * Listado de solo lectura de auditoría admin (quién, qué, cuándo, empresa).
 * No expone borrado — la retención la aplica DataRetentionScheduler.
 */
@RestController
@RequestMapping("/api/admin/auditorias")
public class AuditoriaAdminController {

    private final AuditoriaAdminConsultaService consultaService;

    public AuditoriaAdminController(AuditoriaAdminConsultaService consultaService) {
        this.consultaService = consultaService;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar(
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String adminEmail,
            @RequestParam(required = false) Long empresaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Map<String, Object> data = consultaService.listar(
                accion, adminEmail, empresaId, desde, hasta, page, size);
        return ResponseEntity.ok(ResponseDTO.success("Auditorías", data));
    }

    @GetMapping("/tipos")
    public ResponseEntity<ResponseDTO> tipos() {
        return ResponseEntity.ok(ResponseDTO.success("Tipos", consultaService.tiposEvento()));
    }
}
