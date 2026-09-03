package com.hotclick.controller;

import com.hotclick.dto.ReporteProductoCreateRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ReporteProductoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReporteProductoController {

    private final ReporteProductoService reporteProductoService;

    public ReporteProductoController(ReporteProductoService reporteProductoService) {
        this.reporteProductoService = reporteProductoService;
    }

    @PostMapping("/reportes-producto")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ResponseDTO> crear(@Valid @RequestBody ReporteProductoCreateRequest req) {
        return ResponseEntity.ok(ResponseDTO.success("Reporte recibido", reporteProductoService.crear(req)));
    }

    @GetMapping("/admin/reportes-producto")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> listarPendientes() {
        return ResponseEntity.ok(ResponseDTO.success(
            "Reportes pendientes", reporteProductoService.listarPendientes()));
    }

    @PutMapping("/admin/reportes-producto/{id}/resolver")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> resolver(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String estado = body != null && body.get("estado") != null ? String.valueOf(body.get("estado")) : null;
        String notas = null;
        if (body != null && body.get("notasAdmin") != null) {
            String raw = String.valueOf(body.get("notasAdmin"));
            if (!"null".equals(raw)) notas = raw;
        }
        boolean pausar = false;
        if (body != null && body.get("pausarProducto") != null) {
            String raw = String.valueOf(body.get("pausarProducto"));
            pausar = "true".equalsIgnoreCase(raw) || "1".equals(raw);
        }
        return ResponseEntity.ok(ResponseDTO.success(
            "Reporte actualizado", reporteProductoService.resolver(id, estado, notas, pausar)));
    }
}
