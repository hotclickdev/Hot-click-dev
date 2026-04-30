package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseDTO listarUsuarios() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        return ResponseDTO.success("Usuarios encontrados", usuarios);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerUsuario(@PathVariable Long id) {
        Optional<Usuario> usuario = usuarioService.buscarPorId(id);
        if (usuario.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }
        return ResponseEntity.ok(ResponseDTO.success("Usuario encontrado", usuario.get()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizarUsuario(@PathVariable Long id, @RequestBody Map<String, String> datos) {
        Optional<Usuario> opt = usuarioService.buscarPorId(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));
        }
        Usuario usuario = opt.get();

        if (datos.containsKey("nombre"))          usuario.setNombre(datos.get("nombre"));
        if (datos.containsKey("apellidoPaterno")) usuario.setApellidoPaterno(datos.get("apellidoPaterno"));
        if (datos.containsKey("apellidoMaterno")) usuario.setApellidoMaterno(datos.get("apellidoMaterno"));
        if (datos.containsKey("telefono"))        usuario.setTelefono(datos.get("telefono"));
        if (datos.containsKey("telefonoAlterno")) usuario.setTelefonoAlterno(datos.get("telefonoAlterno"));

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
