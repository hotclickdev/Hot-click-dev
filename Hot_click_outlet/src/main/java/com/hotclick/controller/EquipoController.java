package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.EquipoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/empresa/equipo")
public class EquipoController {

    private static final Set<String> ROLES_PERMITIDOS = Set.of("EDITOR", "LECTOR", "ADMIN");

    @Autowired private CompanyScope companyScope;
    @Autowired private EquipoService equipoService;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo disponible para empresas"));
        }
        return ResponseEntity.ok(ResponseDTO.success("Equipo", equipoService.listar(empresaId)));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> invitar(@RequestBody Map<String, String> body) {
        ResponseEntity<ResponseDTO> denegado = denegarSiNoEmprendedor("Solo el emprendedor puede agregar miembros");
        if (denegado != null) return denegado;
        Usuario currentUser = companyScope.getCurrentUser();
        if (currentUser == null || currentUser.getEmpresa() == null) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        }
        ResponseEntity<ResponseDTO> invalido = validarInvitacion(body);
        if (invalido != null) return invalido;
        String rolEnEmpresa = body.getOrDefault("rolEnEmpresa", "EDITOR");
        equipoService.invitar(
            currentUser.getEmpresa(),
            companyScope.getCurrentEmpresaIdOrOwn(),
            body.get("nombre"),
            body.get("correo").trim().toLowerCase(),
            body.get("password"),
            body.getOrDefault("telefono", "00000000"),
            rolEnEmpresa);
        return ResponseEntity.ok(ResponseDTO.success("Miembro agregado al equipo como " + rolEnEmpresa, null));
    }

    @PutMapping("/{id}/rol")
    public ResponseEntity<ResponseDTO> cambiarRol(@PathVariable Long id, @RequestBody Map<String, String> body) {
        ResponseEntity<ResponseDTO> denegado = denegarSiNoEmprendedor("Solo el emprendedor puede cambiar roles");
        if (denegado != null) return denegado;
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        }
        String nuevoRol = body.get("rolEnEmpresa");
        if (nuevoRol == null || !ROLES_PERMITIDOS.contains(nuevoRol)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Rol inválido. Valores aceptados: EDITOR, LECTOR"));
        }
        return ResponseEntity.ok(ResponseDTO.success("Rol actualizado a " + nuevoRol,
            equipoService.cambiarRol(id, empresaId, nuevoRol)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        ResponseEntity<ResponseDTO> denegado = denegarSiNoEmprendedor("Solo el emprendedor puede eliminar miembros");
        if (denegado != null) return denegado;
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        }
        equipoService.eliminar(id, empresaId, companyScope.getCurrentUserId());
        return ResponseEntity.ok(ResponseDTO.success("Miembro eliminado del equipo", null));
    }

    private ResponseEntity<ResponseDTO> denegarSiNoEmprendedor(String mensaje) {
        if (!companyScope.isEmprendedor()) {
            return ResponseEntity.status(403).body(ResponseDTO.error(mensaje));
        }
        return null;
    }

    private ResponseEntity<ResponseDTO> validarInvitacion(Map<String, String> body) {
        if (body.get("nombre") == null || body.get("nombre").isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));
        }
        if (body.get("correo") == null || body.get("correo").isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        }
        if (body.get("password") == null || body.get("password").length() < 6) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 6 caracteres"));
        }
        String rolEnEmpresa = body.getOrDefault("rolEnEmpresa", "EDITOR");
        if (!ROLES_PERMITIDOS.contains(rolEnEmpresa)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Rol inválido. Valores aceptados: EDITOR, LECTOR"));
        }
        return null;
    }
}
