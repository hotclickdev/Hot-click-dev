package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.moderacion.TerminosProhibidosService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** QA-NEG-038: lista editable de términos prohibidos. Solo ADMIN de plataforma. */
@RestController
@RequestMapping("/api/admin/terminos-prohibidos")
@PreAuthorize("hasRole('ADMIN')")
public class AdminTerminosProhibidosController {

    private final TerminosProhibidosService service;

    public AdminTerminosProhibidosController(TerminosProhibidosService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Términos prohibidos", service.listar()));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> agregar(@RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Término agregado", service.agregar(body.get("termino"))));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.ok(ResponseDTO.success("Término eliminado", null));
    }
}
