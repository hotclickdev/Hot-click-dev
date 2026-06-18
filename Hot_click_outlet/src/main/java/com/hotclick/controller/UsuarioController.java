package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;


@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private UsuarioService    usuarioService;
    @Autowired private PasswordEncoder   passwordEncoder;
    @Autowired private InputSanitizer    sanitizer;
    @Autowired private CompanyScope      companyScope;

    private void assertSelfOrAdmin(Long id) {
        if (companyScope.isAdminIT()) return;
        if (!id.equals(companyScope.getCurrentUserId())) {
            throw new TenantAccessDeniedException("Acceso denegado: solo puedes acceder a tu propio perfil");
        }
    }

    @GetMapping
    public ResponseDTO listarUsuarios() {
        List<Usuario> usuarios = usuarioRepository.findAllWithRolesOrderByIdDesc();
        return ResponseDTO.success("Usuarios encontrados", usuarios);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerUsuario(@PathVariable Long id) {
        assertSelfOrAdmin(id);
        Optional<Usuario> usuario = usuarioRepository.findByIdWithRoles(id);
        if (usuario.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }
        return ResponseEntity.ok(ResponseDTO.success("Usuario encontrado", usuario.get()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizarUsuario(@PathVariable Long id, @RequestBody Map<String, String> datos) {
        assertSelfOrAdmin(id);
        Optional<Usuario> opt = usuarioService.buscarPorId(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }
        Usuario usuario = opt.get();

        if (datos.containsKey("nombre"))          usuario.setNombre(sanitizer.cleanWithLimit(datos.get("nombre"), 100));
        if (datos.containsKey("apellidoPaterno")) usuario.setApellidoPaterno(sanitizer.cleanWithLimit(datos.get("apellidoPaterno"), 100));
        if (datos.containsKey("apellidoMaterno")) usuario.setApellidoMaterno(sanitizer.cleanWithLimit(datos.get("apellidoMaterno"), 100));
        if (datos.containsKey("telefono"))        usuario.setTelefono(sanitizer.cleanWithLimit(datos.get("telefono"), 20));
        if (datos.containsKey("telefonoAlterno")) usuario.setTelefonoAlterno(sanitizer.cleanWithLimit(datos.get("telefonoAlterno"), 20));

        if (datos.containsKey("nuevaContrasena") && !datos.get("nuevaContrasena").isBlank()) {
            String actual = datos.getOrDefault("contrasenaActual", "");
            if (!passwordEncoder.matches(actual, usuario.getContrasenaHash())) {
                return ResponseEntity.status(400).body(ResponseDTO.error("La contraseña actual es incorrecta"));
            }
            usuario.setContrasenaHash(passwordEncoder.encode(datos.get("nuevaContrasena")));
        }

        usuarioRepository.save(usuario);
        return ResponseEntity.ok(ResponseDTO.success("Datos actualizados correctamente", usuario));
    }
}
