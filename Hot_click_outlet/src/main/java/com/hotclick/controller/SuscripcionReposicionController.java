package com.hotclick.controller;

import com.hotclick.dto.AvisarReposicionRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.SuscripcionReposicionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** "Avisame cuando vuelva" — ficha de producto agotado, público (con o sin sesión). */
@RestController
@RequestMapping("/api/productos")
public class SuscripcionReposicionController {

    private final SuscripcionReposicionService service;

    public SuscripcionReposicionController(SuscripcionReposicionService service) {
        this.service = service;
    }

    @PostMapping("/{id}/avisar-reposicion")
    public ResponseEntity<ResponseDTO> avisarReposicion(
            @PathVariable Long id, @Valid @RequestBody AvisarReposicionRequest req) {
        return ResponseEntity.ok(ResponseDTO.success(
            "Te avisamos cuando vuelva", service.suscribirse(id, req.getCorreo())));
    }
}
