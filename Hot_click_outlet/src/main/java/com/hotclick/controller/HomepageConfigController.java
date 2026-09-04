package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.HomepageConfig;
import com.hotclick.repository.HomepageConfigRepository;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/homepage")
public class HomepageConfigController {

    @Autowired private HomepageConfigRepository repo;
    @Autowired private InputSanitizer sanitizer;

    private HomepageConfig obtenerOCrear() {
        return repo.findById(1L).orElseGet(() -> repo.save(new HomepageConfig()));
    }

    /** Público — la home lo lee sin autenticación. */
    @GetMapping("/publico")
    public ResponseEntity<ResponseDTO> obtenerPublico() {
        return ResponseEntity.ok(ResponseDTO.success("Homepage", obtenerOCrear()));
    }

    /** Admin — mismo dato, para precargar el formulario de configuración. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> obtenerAdmin() {
        return ResponseEntity.ok(ResponseDTO.success("Homepage", obtenerOCrear()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> actualizar(@RequestBody HomepageConfig datos) {
        HomepageConfig config = obtenerOCrear();
        if (datos.getHeroSections() != null) {
            config.setHeroSections(sanitizer.cleanWithLimit(datos.getHeroSections(), 100));
        }
        if (datos.getVisibleCategoriaIds() != null) {
            config.setVisibleCategoriaIds(sanitizer.cleanWithLimit(datos.getVisibleCategoriaIds(), 1000));
        }
        if (datos.getMaxCategorias() != null) {
            config.setMaxCategorias(datos.getMaxCategorias());
        }
        return ResponseEntity.ok(ResponseDTO.success("Homepage actualizado", repo.save(config)));
    }
}
