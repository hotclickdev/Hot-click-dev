package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Convenio;
import com.hotclick.repository.ConvenioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/convenios")
public class ConvenioController {

    @Autowired private ConvenioRepository repo;

    /** Público — solo los activos */
    @GetMapping("/publicos")
    public ResponseEntity<ResponseDTO> listarPublicos() {
        return ResponseEntity.ok(ResponseDTO.success("Convenios",
            repo.findByActivoTrueAndEstadoOrderByNombreAsc(1)));
    }

    /** Admin — todos */
    @GetMapping
    public ResponseEntity<ResponseDTO> listarTodos() {
        return ResponseEntity.ok(ResponseDTO.success("Convenios",
            repo.findAllByOrderByFechaRegistroDesc()));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@RequestBody Convenio convenio) {
        convenio.setFechaRegistro(LocalDateTime.now());
        convenio.setEstado(1);
        return ResponseEntity.ok(ResponseDTO.success("Creado", repo.save(convenio)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(@PathVariable Long id, @RequestBody Convenio datos) {
        Convenio c = repo.findById(id).orElseThrow(() -> new RuntimeException("No encontrado"));
        c.setNombre(datos.getNombre());
        c.setDescripcion(datos.getDescripcion());
        c.setLogoUrl(datos.getLogoUrl());
        c.setUrlWeb(datos.getUrlWeb());
        c.setActivo(datos.getActivo());
        return ResponseEntity.ok(ResponseDTO.success("Actualizado", repo.save(c)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        Convenio c = repo.findById(id).orElseThrow(() -> new RuntimeException("No encontrado"));
        c.setEstado(0);
        c.setActivo(false);
        repo.save(c);
        return ResponseEntity.ok(ResponseDTO.success("Eliminado", null));
    }
}
