package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/admin/usuarios")
public class AdminUsuarioController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository     rolRepository;

    /** Lista todos los usuarios ordenados por ID desc. */
    @GetMapping
    public ResponseDTO listarTodos() {
        return ResponseDTO.success("Usuarios", usuarioRepository.findAllByOrderByIdDesc());
    }

    /** Lista solo los usuarios pendientes de aprobación. */
    @GetMapping("/pendientes")
    public ResponseDTO listarPendientes() {
        List<Usuario> pendientes = usuarioRepository.findByEstadoOrderByIdDesc(Constants.ESTADO_PENDIENTE);
        return ResponseDTO.success("Usuarios pendientes", pendientes);
    }

    /**
     * Aprueba un usuario: activa la cuenta y asigna el rol indicado.
     * Body: { "rol": "USUARIO_FINAL" | "ADMIN_IT" | "ADMIN_CLIENTE" }
     */
    @PutMapping("/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id,
                                                @RequestBody Map<String, String> body) {
        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }
        Usuario usuario = opt.get();

        String rolNombre = body.getOrDefault("rol", Constants.ROL_USUARIO_FINAL).trim();
        if (!List.of(Constants.ROL_USUARIO_FINAL, Constants.ROL_ADMIN_IT, Constants.ROL_ADMIN_CLIENTE)
                .contains(rolNombre)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Rol inválido: " + rolNombre));
        }

        Optional<Rol> rolOpt = rolRepository.findByNombreRol(rolNombre);
        if (rolOpt.isEmpty()) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Rol '" + rolNombre + "' no existe en la BD"));
        }

        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.getRoles().clear();
        usuario.getRoles().add(rolOpt.get());
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(ResponseDTO.success(
            "Usuario aprobado con rol " + rolNombre, null));
    }

    /**
     * Rechaza/elimina un usuario pendiente.
     * Usa soft-delete (estado = ELIMINADO).
     */
    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(@PathVariable Long id) {
        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }
        Usuario usuario = opt.get();
        usuario.setEstado(Constants.ESTADO_ELIMINADO);
        usuarioRepository.save(usuario);
        return ResponseEntity.ok(ResponseDTO.success("Usuario rechazado", null));
    }

    /**
     * Cambia el rol de cualquier usuario existente.
     * Body: { "rol": "USUARIO_FINAL" | "ADMIN_IT" | "ADMIN_CLIENTE" }
     */
    @PutMapping("/{id}/rol")
    public ResponseEntity<ResponseDTO> cambiarRol(@PathVariable Long id,
                                                   @RequestBody Map<String, String> body) {
        String rolNombre = body.get("rol");
        if (rolNombre == null || rolNombre.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El campo 'rol' es requerido"));
        }

        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }

        Optional<Rol> rolOpt = rolRepository.findByNombreRol(rolNombre.trim());
        if (rolOpt.isEmpty()) {
            return ResponseEntity.status(400).body(ResponseDTO.error("Rol '" + rolNombre + "' no existe"));
        }

        Usuario usuario = opt.get();
        usuario.getRoles().clear();
        usuario.getRoles().add(rolOpt.get());
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(ResponseDTO.success("Rol actualizado a " + rolNombre, null));
    }

    /**
     * Activa o desactiva una cuenta existente.
     * Body: { "estado": 1 } (1=activo, 2=inactivo)
     */
    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(@PathVariable Long id,
                                                      @RequestBody Map<String, Object> body) {
        Object raw = body.get("estado");
        if (raw == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El campo 'estado' es requerido"));
        }
        int nuevoEstado = Integer.parseInt(raw.toString());
        if (nuevoEstado != Constants.ESTADO_ACTIVO && nuevoEstado != Constants.ESTADO_INACTIVO) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Estado inválido (usa 1=activo, 2=inactivo)"));
        }

        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }

        Usuario usuario = opt.get();
        usuario.setEstado(nuevoEstado);
        usuarioRepository.save(usuario);

        String msg = nuevoEstado == Constants.ESTADO_ACTIVO ? "Usuario activado" : "Usuario desactivado";
        return ResponseEntity.ok(ResponseDTO.success(msg, null));
    }
}
