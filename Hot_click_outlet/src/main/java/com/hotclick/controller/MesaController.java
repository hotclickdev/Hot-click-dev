package com.hotclick.controller;

import com.hotclick.security.TenantContext;
import com.hotclick.service.MesaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Gestión admin de mesas/puntos de autoservicio.
 * Requiere rol EMPRENDEDOR o ADMIN_IT.
 * Rutas bajo /api/admin/mesas.
 */
@RestController
@RequestMapping("/api/admin/mesas")
public class MesaController {

    private final MesaService mesaService;

    public MesaController(MesaService mesaService) {
        this.mesaService = mesaService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN_IT', 'ADMIN_CLIENTE')")
    public ResponseEntity<List<Map<String, Object>>> listar() {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(mesaService.listarPorEmpresa(empresaId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN_IT', 'ADMIN_CLIENTE')")
    public ResponseEntity<Map<String, Object>> crear(@RequestBody Map<String, String> body) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        String nombre = body.get("nombre");
        if (nombre == null || nombre.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "nombre es requerido"));
        return ResponseEntity.ok(mesaService.crear(
            empresaId, nombre, body.get("descripcion"), body.get("tipo")));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN_IT', 'ADMIN_CLIENTE')")
    public ResponseEntity<Map<String, Object>> actualizar(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        Boolean activo = body.containsKey("activo") ? (Boolean) body.get("activo") : null;
        return ResponseEntity.ok(mesaService.actualizar(
            id, empresaId,
            (String) body.get("nombre"),
            (String) body.get("descripcion"),
            (String) body.get("tipo"),
            activo
        ));
    }

    @PostMapping("/{id}/regenerar-token")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN_IT', 'ADMIN_CLIENTE')")
    public ResponseEntity<Map<String, Object>> regenerarToken(@PathVariable Long id) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(mesaService.regenerarToken(id, empresaId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR', 'ADMIN_IT', 'ADMIN_CLIENTE')")
    public ResponseEntity<Map<String, String>> eliminar(@PathVariable Long id) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return ResponseEntity.status(401).build();
        mesaService.eliminar(id, empresaId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
