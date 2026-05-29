package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empresa/equipo")
public class EquipoController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository     rolRepository;
    @Autowired private PasswordEncoder   passwordEncoder;
    @Autowired private CompanyScope      companyScope;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo disponible para empresas"));
        }
        List<Usuario> miembros = usuarioRepository.findByEmpresaIdOrderByIdDesc(empresaId);
        return ResponseEntity.ok(ResponseDTO.success("Equipo", miembros));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> invitar(@RequestBody Map<String, String> body) {
        if (!companyScope.isEmprendedor()) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el emprendedor puede agregar miembros"));
        }
        Usuario currentUser = companyScope.getCurrentUser();
        if (currentUser == null || currentUser.getEmpresa() == null) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        }

        String nombre   = body.get("nombre");
        String correo   = body.get("correo");
        String password = body.get("password");
        String telefono = body.getOrDefault("telefono", "00000000");

        if (nombre == null || nombre.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));
        if (correo == null || correo.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        if (password == null || password.length() < 6)
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 6 caracteres"));
        if (usuarioRepository.existsByCorreo(correo.trim().toLowerCase()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo ya está registrado"));

        Empresa empresa = currentUser.getEmpresa();

        Usuario nuevo = new Usuario();
        String[] partes = nombre.trim().split("\\s+", 2);
        nuevo.setNombre(partes[0]);
        nuevo.setApellidoPaterno(partes.length > 1 ? partes[1] : "Admin");
        nuevo.setIdentificacion("ADM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        nuevo.setCorreo(correo.trim().toLowerCase());
        nuevo.setContrasenaHash(passwordEncoder.encode(password));
        nuevo.setTelefono(telefono);
        nuevo.setEstado(Constants.ESTADO_ACTIVO);
        nuevo.setIntentosFallidos(0);
        nuevo.setFechaRegistro(LocalDateTime.now());
        nuevo.setEmpresa(empresa);

        var rolAdminCliente = rolRepository.findByNombreRol(Constants.ROL_ADMIN_CLIENTE)
            .orElseThrow(() -> new RuntimeException("Rol ADMIN_CLIENTE no configurado"));
        nuevo.getRoles().add(rolAdminCliente);

        usuarioRepository.save(nuevo);
        return ResponseEntity.ok(ResponseDTO.success("Miembro agregado al equipo", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        if (!companyScope.isEmprendedor()) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el emprendedor puede eliminar miembros"));
        }
        Long empresaId = companyScope.getCurrentEmpresaId();
        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));

        Usuario miembro = opt.get();
        if (!empresaId.equals(miembro.getEmpresaId()))
            return ResponseEntity.status(403).body(ResponseDTO.error("El usuario no pertenece a tu empresa"));
        if (miembro.getId().equals(companyScope.getCurrentUserId()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("No puedes eliminarte a ti mismo"));

        miembro.setEstado(Constants.ESTADO_ELIMINADO);
        usuarioRepository.save(miembro);
        return ResponseEntity.ok(ResponseDTO.success("Miembro eliminado", null));
    }
}
