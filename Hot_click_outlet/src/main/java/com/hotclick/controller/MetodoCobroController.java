package com.hotclick.controller;

import com.hotclick.dto.MetodoCobroCreateRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.MetodoCobroService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/metodos-cobro")
public class MetodoCobroController {

    private final MetodoCobroService metodoCobroService;

    public MetodoCobroController(MetodoCobroService metodoCobroService) {
        this.metodoCobroService = metodoCobroService;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Métodos de cobro", metodoCobroService.listar()));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@Valid @RequestBody MetodoCobroCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.success("Método de cobro guardado", metodoCobroService.crear(req)));
    }

    @PutMapping("/{id}/predeterminado")
    public ResponseEntity<ResponseDTO> marcarPredeterminado(@PathVariable Long id) {
        return ResponseEntity.ok(
                ResponseDTO.success("Método predeterminado actualizado", metodoCobroService.marcarPredeterminado(id)));
    }
}
