package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.AdminUsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/usuarios")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsuarioController {

    @Autowired private AdminUsuarioService adminUsuarioService;

    @GetMapping
    public ResponseDTO listarTodos() {
        return ResponseDTO.success("Usuarios", adminUsuarioService.listarTodos());
    }

    @GetMapping("/pendientes")
    public ResponseDTO listarPendientes() {
        return ResponseDTO.success("Usuarios pendientes", adminUsuarioService.listarPendientes());
    }

    @PutMapping("/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String rol = adminUsuarioService.aprobar(id, body.getOrDefault("rol", null));
            return ResponseEntity.ok(ResponseDTO.success("Usuario aprobado con rol " + rol, null));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(500).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(@PathVariable Long id) {
        adminUsuarioService.rechazar(id);
        return ResponseEntity.ok(ResponseDTO.success("Usuario rechazado", null));
    }

    @PutMapping("/{id}/rol")
    public ResponseEntity<ResponseDTO> cambiarRol(@PathVariable Long id, @RequestBody Map<String, String> body) {
        adminUsuarioService.cambiarRol(id, body.get("rol"));
        return ResponseEntity.ok(ResponseDTO.success("Rol actualizado a " + body.get("rol"), null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        adminUsuarioService.eliminar(id);
        return ResponseEntity.ok(ResponseDTO.success("Usuario eliminado", null));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object raw = body.get("estado");
        if (raw == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El campo 'estado' es requerido"));
        }
        String msg = adminUsuarioService.cambiarEstado(id, Integer.parseInt(raw.toString()));
        return ResponseEntity.ok(ResponseDTO.success(msg, null));
    }

    @PutMapping("/{id}/restaurar")
    public ResponseEntity<ResponseDTO> restaurar(@PathVariable Long id) {
        adminUsuarioService.restaurar(id);
        return ResponseEntity.ok(ResponseDTO.success("Usuario restaurado correctamente", null));
    }

    @PutMapping("/{id}/bloquear")
    public ResponseEntity<ResponseDTO> bloquear(@PathVariable Long id) {
        adminUsuarioService.bloquear(id);
        return ResponseEntity.ok(ResponseDTO.success("Usuario bloqueado", null));
    }

    @PutMapping("/{id}/desbloquear")
    public ResponseEntity<ResponseDTO> desbloquear(@PathVariable Long id) {
        adminUsuarioService.desbloquear(id);
        return ResponseEntity.ok(ResponseDTO.success("Usuario desbloqueado", null));
    }
}
