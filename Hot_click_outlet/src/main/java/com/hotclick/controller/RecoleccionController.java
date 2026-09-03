package com.hotclick.controller;

import com.hotclick.dto.RecoleccionCreateRequest;
import com.hotclick.dto.RecoleccionRechazarRequest;
import com.hotclick.dto.RecoleccionTarifaRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.RecoleccionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recolecciones")
public class RecoleccionController {

    private final RecoleccionService recoleccionService;

    public RecoleccionController(RecoleccionService recoleccionService) {
        this.recoleccionService = recoleccionService;
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@Valid @RequestBody RecoleccionCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.success("Solicitud enviada", recoleccionService.crear(req)));
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes obtenidas", recoleccionService.listar()));
    }

    @PutMapping("/{id}/tarifa")
    public ResponseEntity<ResponseDTO> tarifa(
            @PathVariable Long id,
            @Valid @RequestBody RecoleccionTarifaRequest req) {
        return ResponseEntity.ok(ResponseDTO.success("Tarifa indicada", recoleccionService.cotizarTarifa(id, req)));
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(
            @PathVariable Long id,
            @Valid @RequestBody RecoleccionRechazarRequest req) {
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", recoleccionService.rechazar(id, req)));
    }

    @PutMapping("/{id}/cancelar")
    public ResponseEntity<ResponseDTO> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Solicitud cancelada", recoleccionService.cancelar(id)));
    }
}
