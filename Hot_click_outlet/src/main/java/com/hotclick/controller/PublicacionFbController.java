package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.PublicacionFacebookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/publicaciones-fb")
@PreAuthorize("hasRole('ADMIN')")
public class PublicacionFbController {

    @Autowired private PublicacionFacebookService service;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar(
            @RequestParam(required = false) String estado) {
        try {
            Object data = estado != null
                ? service.listarPorEstado(estado)
                : service.listarTodas();
            return ResponseEntity.ok(ResponseDTO.success("Publicaciones FB", data));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{productoId}")
    public ResponseEntity<ResponseDTO> generar(
            @PathVariable Long productoId,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String notas = body != null ? body.get("notasAdmin") : null;
            var pub = service.crearOActualizar(productoId, notas);
            return ResponseEntity.ok(ResponseDTO.success("Publicación generada", pub));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/publicado")
    public ResponseEntity<ResponseDTO> marcarPublicado(@PathVariable Long id) {
        try {
            var pub = service.marcarPublicado(id);
            return ResponseEntity.ok(ResponseDTO.success("Marcado como publicado", pub));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            service.eliminar(id);
            return ResponseEntity.ok(ResponseDTO.success("Publicación eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
