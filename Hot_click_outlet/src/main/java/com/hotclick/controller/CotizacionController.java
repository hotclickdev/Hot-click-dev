package com.hotclick.controller;

import com.hotclick.dto.CotizacionB2BRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Cotizacion;
import com.hotclick.security.TenantContext;
import com.hotclick.service.CotizacionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/cotizaciones")
public class CotizacionController {

    @Autowired private CotizacionService cotizacionService;

    // ── Endpoints protegidos (admin empresa) ─────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> listar(
            @RequestParam(required = false) String estado) {
        Long empresaId = TenantContext.get();
        return ResponseEntity.ok(ResponseDTO.success("ok",
            cotizacionService.listar(empresaId, estado)));
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> kpis() {
        return ResponseEntity.ok(ResponseDTO.success("ok",
            cotizacionService.kpis(TenantContext.get())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("ok",
            cotizacionService.buscarPorId(id, TenantContext.get())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> crear(@Valid @RequestBody CotizacionB2BRequestDTO dto) {
        Cotizacion c = cotizacionService.crear(dto, TenantContext.get());
        return ResponseEntity.ok(ResponseDTO.success("Cotización creada", c));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody CotizacionB2BRequestDTO dto) {
        return ResponseEntity.ok(ResponseDTO.success("Actualizada",
            cotizacionService.actualizar(id, dto, TenantContext.get())));
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> cambiarEstado(
            @PathVariable Long id,
            @RequestParam String estado) {
        return ResponseEntity.ok(ResponseDTO.success("Estado actualizado",
            cotizacionService.cambiarEstado(id, estado, TenantContext.get())));
    }

    @PostMapping("/{id}/duplicar")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> duplicar(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Cotización duplicada",
            cotizacionService.duplicar(id, TenantContext.get())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        cotizacionService.eliminar(id, TenantContext.get());
        return ResponseEntity.ok(ResponseDTO.success("Eliminada", null));
    }

    // ── Enlace público (sin auth) ─────────────────────────────────────────────────

    @GetMapping("/publica/{token}")
    public ResponseEntity<ResponseDTO> publica(@PathVariable UUID token) {
        return ResponseEntity.ok(ResponseDTO.success("ok",
            cotizacionService.buscarPorToken(token)));
    }
}
