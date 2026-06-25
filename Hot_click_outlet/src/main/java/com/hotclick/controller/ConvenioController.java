package com.hotclick.controller;
import com.hotclick.utils.Constants;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Convenio;
import com.hotclick.repository.ConvenioRepository;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/convenios")
public class ConvenioController {

    @Autowired private ConvenioRepository repo;
    @Autowired private InputSanitizer sanitizer;

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
        sanitizarConvenio(convenio);
        convenio.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        convenio.setEstado(1);
        return ResponseEntity.ok(ResponseDTO.success("Creado", repo.save(convenio)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(@PathVariable Long id, @RequestBody Convenio datos) {
        Convenio c = repo.findById(id).orElseThrow(() -> new RuntimeException("No encontrado"));
        sanitizarConvenio(datos);
        c.setNombre(datos.getNombre());
        c.setDescripcion(datos.getDescripcion());
        c.setLogoUrl(datos.getLogoUrl());
        c.setUrlWeb(datos.getUrlWeb());
        c.setActivo(datos.getActivo());
        return ResponseEntity.ok(ResponseDTO.success("Actualizado", repo.save(c)));
    }

    private void sanitizarConvenio(Convenio c) {
        if (c.getNombre()     != null) c.setNombre(sanitizer.cleanWithLimit(c.getNombre(), 150));
        if (c.getDescripcion() != null) c.setDescripcion(sanitizer.cleanWithLimit(c.getDescripcion(), 500));
        if (c.getLogoUrl()    != null) c.setLogoUrl(sanitizer.cleanWithLimit(c.getLogoUrl(), 500));
        if (c.getUrlWeb()     != null) c.setUrlWeb(sanitizer.cleanWithLimit(c.getUrlWeb(), 300));
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
