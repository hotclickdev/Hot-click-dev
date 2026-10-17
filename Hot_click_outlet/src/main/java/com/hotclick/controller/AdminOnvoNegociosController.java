package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.onvo.AdminOnvoNegociosService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * S2-29 / S3-22 (lectura): admin de cuentas ONVO de los negocios. Solo admin de plataforma.
 * Pausar/reanudar cobros sigue en {@code PUT /api/admin/empresas/{id}/cobros-pausados}.
 */
@RestController
@RequestMapping("/api/admin/onvo/negocios")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOnvoNegociosController {

    private final AdminOnvoNegociosService service;

    public AdminOnvoNegociosController(AdminOnvoNegociosService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> listar(@RequestParam(required = false) String estado,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "50") int size) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Negocios ONVO", service.listar(estado, page, size)));
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("success", false);
            err.put("code", AdminOnvoNegociosService.CODIGO_ESTADO_INVALIDO);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Negocio ONVO", service.detalle(id)));
    }
}
