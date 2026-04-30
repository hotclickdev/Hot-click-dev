package com.hotclick.controller;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.JwtResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private JwtUtil jwtUtil;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> register(@RequestBody Usuario usuario) {
        try {
            usuario.setContrasenaHash(passwordEncoder.encode(usuario.getContrasenaHash()));
            Usuario nuevoUsuario = usuarioService.registrarUsuario(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Usuario registrado exitosamente", nuevoUsuario));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody JwtRequest request) {
        var usuarioOpt = usuarioService.buscarPorCorreo(request.getCorreo());

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        Usuario usuario = usuarioOpt.get();

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
            usuarioService.incrementarIntentosFallidos(usuario.getId());
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        usuarioService.resetearIntentosFallidos(usuario.getId());
        usuarioService.actualizarUltimoAcceso(usuario.getId());

        String rol = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
        String token = jwtUtil.generateToken(usuario.getCorreo(), usuario.getId(), rol);

        return ResponseEntity.ok(new JwtResponse(token, usuario.getId(), usuario.getCorreo(), rol));
    }
}
