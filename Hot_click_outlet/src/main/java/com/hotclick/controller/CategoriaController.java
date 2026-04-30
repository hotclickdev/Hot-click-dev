package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Categoria;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(
            ResponseDTO.success("Categorías", categoriaRepository.findByEstado(Constants.ESTADO_ACTIVO))
        );
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails ud) {
        try {
            if (body.get("nombreCategoria") == null || body.get("nombreCategoria").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es obligatorio"));

            Categoria cat = new Categoria();
            cat.setNombreCategoria(body.get("nombreCategoria").trim());
            cat.setDescripcion(body.getOrDefault("descripcion", ""));
            cat.setEstado(Constants.ESTADO_ACTIVO);
            cat.setAdminCliente(
                usuarioRepository.findByCorreo(ud.getUsername())
                    .orElseThrow(() -> new RuntimeException("Admin no encontrado"))
            );
            return ResponseEntity.ok(ResponseDTO.success("Categoría creada", categoriaRepository.save(cat)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Categoria cat = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
            if (body.get("nombreCategoria") != null && !body.get("nombreCategoria").isBlank())
                cat.setNombreCategoria(body.get("nombreCategoria").trim());
            if (body.get("descripcion") != null)
                cat.setDescripcion(body.get("descripcion"));
            return ResponseEntity.ok(ResponseDTO.success("Categoría actualizada", categoriaRepository.save(cat)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Categoria cat = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
            cat.setEstado(Constants.ESTADO_INACTIVO);
            categoriaRepository.save(cat);
            return ResponseEntity.ok(ResponseDTO.success("Categoría eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
