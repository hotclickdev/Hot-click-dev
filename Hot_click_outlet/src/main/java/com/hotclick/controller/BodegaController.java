package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.repository.BodegaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/bodegas")
public class BodegaController {

    @Autowired
    private BodegaRepository bodegaRepository;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(
            ResponseDTO.success("Bodegas", bodegaRepository.findAll())
        );
    }
}
