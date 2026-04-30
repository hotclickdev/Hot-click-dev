package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.repository.CategoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    @Autowired
    private CategoriaRepository categoriaRepository;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(
            ResponseDTO.success("Categorías", categoriaRepository.findAll())
        );
    }
}
