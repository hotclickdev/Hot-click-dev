package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
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

    private static final Set<String> ROLES_PERMITIDOS = Set.of("EDITOR", "LECTOR", "ADMIN", "CAJERO");
    private static final String CAJERO = "CAJERO";
    private static final String MSG_ROL_INVALIDO = "Rol inválido. Valores aceptados: EDITOR, LECTOR, ADMIN, CAJERO";

    @Autowired private CompanyScope companyScope;
    @Autowired private EquipoService equipoService;
    @Autowired private com.hotclick.security.PropietarioGuard propietarioGuard;

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
        if (CAJERO.equals(body.get("rolEnEmpresa"))) return invitarCajero(body);
        ResponseEntity<ResponseDTO> denegado = denegarSiNoEmprendedor("Solo el emprendedor puede agregar miembros");
        if (denegado != null) return denegado;
        // Empresa destino: UNA sola vez (la del token activo, multi-negocio). El service la bloquea, cuenta el cupo
        // y da de alta al miembro sobre esa misma empresa; antes el alta usaba usuario.empresa (otro negocio).
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null || !propietarioGuard.puedeGestionarEmpresa(empresaId)) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        }
        ResponseEntity<ResponseDTO> invalido = validarInvitacion(body);
        if (invalido != null) return invalido;
        String rolEnEmpresa = body.getOrDefault("rolEnEmpresa", "EDITOR");
        equipoService.invitar(
            empresaId,
            body.get("nombre"),
            body.get("correo").trim().toLowerCase(java.util.Locale.ROOT),
            body.get("password"),
            body.getOrDefault("telefono", "00000000"),
            rolEnEmpresa);
        return ResponseEntity.ok(ResponseDTO.success("Miembro agregado al equipo como " + rolEnEmpresa, null));
    }

    @PutMapping("/{id}/rol")
    public ResponseEntity<ResponseDTO> cambiarRol(@PathVariable Long id, @RequestBody Map<String, String> body) {
        if (CAJERO.equals(body.get("rolEnEmpresa"))) return asignarCajero(id);
        ResponseEntity<ResponseDTO> denegado = denegarSiNoEmprendedor("Solo el emprendedor puede cambiar roles");
        if (denegado != null) return denegado;
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        }
        String nuevoRol = body.get("rolEnEmpresa");
        if (nuevoRol == null || !ROLES_PERMITIDOS.contains(nuevoRol)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_ROL_INVALIDO));
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
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        }
        equipoService.eliminar(id, empresaId, companyScope.getCurrentUserId());
        return ResponseEntity.ok(ResponseDTO.success("Miembro eliminado del equipo", null));
    }

    /** CAJERO: lo invita el PROPIETARIO o el ADMIN de equipo, siempre sobre la empresa del token. */
    private ResponseEntity<ResponseDTO> invitarCajero(Map<String, String> body) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (!companyScope.isEmprendedor() || empresaId == null || !propietarioGuard.puedeAsignarCajero(empresaId)) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el propietario o un admin del equipo puede agregar cajeros"));
        }
        ResponseEntity<ResponseDTO> invalido = validarInvitacion(body);
        if (invalido != null) return invalido;
        equipoService.invitar(empresaId, body.get("nombre"),
            body.get("correo").trim().toLowerCase(java.util.Locale.ROOT), body.get("password"),
            body.getOrDefault("telefono", "00000000"), CAJERO);
        return ResponseEntity.ok(ResponseDTO.success("Miembro agregado al equipo como " + CAJERO, null));
    }

    /** Pasar a CAJERO: PROPIETARIO o ADMIN de equipo; el ADMIN no puede degradar a otro ADMIN ni al propietario. */
    private ResponseEntity<ResponseDTO> asignarCajero(Long id) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (!companyScope.isEmprendedor() || empresaId == null || !propietarioGuard.puedeAsignarCajero(empresaId)) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el propietario o un admin del equipo puede asignar cajeros"));
        }
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId) && equipoService.esAdminOPropietario(id, empresaId)) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Un admin del equipo no puede cambiar el rol de otro admin"));
        }
        return ResponseEntity.ok(ResponseDTO.success("Rol actualizado a " + CAJERO,
            equipoService.cambiarRol(id, empresaId, CAJERO)));
    }

    private ResponseEntity<ResponseDTO> denegarSiNoEmprendedor(String mensaje) {
        // QA3-012: los miembros de equipo (EDITOR, LECTOR, ADMIN) también llevan rol Spring
        // EMPRENDEDOR; hace falta ser PROPIETARIO de la empresa (y no sesión de soporte).
        if (!companyScope.isEmprendedor() || companyScope.isImpersonating()
                || !propietarioGuard.puedeGestionarEmpresa(companyScope.getCurrentEmpresaIdOrOwn())) {
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
        if (body.get("password") == null || body.get("password").length() < 8) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 8 caracteres"));
        }
        String rolEnEmpresa = body.getOrDefault("rolEnEmpresa", "EDITOR");
        if (!ROLES_PERMITIDOS.contains(rolEnEmpresa)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_ROL_INVALIDO));
        }
        return null;
    }
}
