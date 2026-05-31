package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.BlogEntrada;
import com.hotclick.repository.BlogEntradaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/blog")
public class BlogController {

    @Autowired private BlogEntradaRepository repo;

    /** Público — solo publicados */
    @GetMapping("/publico")
    public ResponseEntity<ResponseDTO> listarPublicos() {
        return ResponseEntity.ok(ResponseDTO.success("Blog",
            repo.findByPublicadoTrueAndEstadoOrderByFechaPublicacionDesc(1)));
    }

    @GetMapping("/publico/{slug}")
    public ResponseEntity<ResponseDTO> porSlug(@PathVariable String slug) {
        return repo.findBySlug(slug)
            .filter(e -> Boolean.TRUE.equals(e.getPublicado()))
            .map(e -> ResponseEntity.ok(ResponseDTO.success("Entrada", e)))
            .orElse(ResponseEntity.status(404).body(ResponseDTO.error("No encontrado")));
    }

    /** Admin — todas */
    @GetMapping
    public ResponseEntity<ResponseDTO> listarTodas() {
        return ResponseEntity.ok(ResponseDTO.success("Blog", repo.findAllByOrderByFechaCreacionDesc()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtener(@PathVariable Long id) {
        return repo.findById(id)
            .map(e -> ResponseEntity.ok(ResponseDTO.success("Entrada", e)))
            .orElse(ResponseEntity.status(404).body(ResponseDTO.error("No encontrado")));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@RequestBody BlogEntrada entrada) {
        entrada.setFechaCreacion(LocalDateTime.now());
        entrada.setEstado(1);
        if (entrada.getSlug() == null || entrada.getSlug().isBlank()) {
            entrada.setSlug(slugify(entrada.getTitulo()));
        }
        if (Boolean.TRUE.equals(entrada.getPublicado()) && entrada.getFechaPublicacion() == null) {
            entrada.setFechaPublicacion(LocalDateTime.now());
        }
        return ResponseEntity.ok(ResponseDTO.success("Creado", repo.save(entrada)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(@PathVariable Long id, @RequestBody BlogEntrada datos) {
        BlogEntrada e = repo.findById(id).orElseThrow(() -> new RuntimeException("No encontrado"));
        e.setTitulo(datos.getTitulo());
        if (datos.getSlug() != null && !datos.getSlug().isBlank()) {
            e.setSlug(datos.getSlug());
        }
        e.setResumen(datos.getResumen());
        e.setContenido(datos.getContenido());
        e.setImagenUrl(datos.getImagenUrl());
        boolean wasDraft = !Boolean.TRUE.equals(e.getPublicado());
        e.setPublicado(datos.getPublicado());
        if (Boolean.TRUE.equals(datos.getPublicado()) && wasDraft) {
            e.setFechaPublicacion(LocalDateTime.now());
        }
        return ResponseEntity.ok(ResponseDTO.success("Actualizado", repo.save(e)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        BlogEntrada e = repo.findById(id).orElseThrow(() -> new RuntimeException("No encontrado"));
        e.setEstado(0);
        repo.save(e);
        return ResponseEntity.ok(ResponseDTO.success("Eliminado", null));
    }

    private String slugify(String text) {
        if (text == null) return "";
        return text.toLowerCase()
            .replaceAll("[áàäâ]", "a").replaceAll("[éèëê]", "e")
            .replaceAll("[íìïî]", "i").replaceAll("[óòöô]", "o")
            .replaceAll("[úùüû]", "u").replaceAll("[ñ]", "n")
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
    }
}
