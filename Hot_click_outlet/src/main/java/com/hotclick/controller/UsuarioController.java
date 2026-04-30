package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping
    public ResponseDTO listarUsuarios() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        return ResponseDTO.success("Usuarios encontrados", usuarios);
    }
}
