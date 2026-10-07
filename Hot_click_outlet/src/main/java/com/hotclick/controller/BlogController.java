package com.hotclick.controller;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.utils.Constants;

import com.hotclick.dto.BlogEntradaDatos;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.BlogEntrada;
import com.hotclick.repository.BlogEntradaRepository;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/blog")
public class BlogController {

    @Autowired private BlogEntradaRepository repo;
    @Autowired private InputSanitizer sanitizer;
    @Autowired private com.hotclick.service.TextModerationService textModerationService;

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

    /** Admin — todas, incluye borradores */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> listarTodas() {
        return ResponseEntity.ok(ResponseDTO.success("Blog", repo.findTop100ByOrderByFechaCreacionDesc()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> obtener(@PathVariable Long id) {
        return repo.findById(id)
            .map(e -> ResponseEntity.ok(ResponseDTO.success("Entrada", e)))
            .orElse(ResponseEntity.status(404).body(ResponseDTO.error("No encontrado")));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> crear(@RequestBody BlogEntradaDatos datos) {
        if (!textoPermitido(datos))
            return ResponseEntity.badRequest().body(ResponseDTO.error("El contenido de la publicación no está permitido en la plataforma"));
        BlogEntrada entrada = new BlogEntrada();
        copiarTexto(entrada, datos);
        entrada.setPublicado(datos.publicado());
        entrada.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        entrada.setEstado(1);
        if (entrada.getSlug() == null || entrada.getSlug().isBlank()) {
            entrada.setSlug(slugify(entrada.getTitulo()));
        }
        if (Boolean.TRUE.equals(entrada.getPublicado())) {
            entrada.setFechaPublicacion(LocalDateTime.now(Constants.ZONA_CR));
        }
        return ResponseEntity.ok(ResponseDTO.success("Creado", repo.save(entrada)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> actualizar(@PathVariable Long id, @RequestBody BlogEntradaDatos datos) {
        if (!textoPermitido(datos))
            return ResponseEntity.badRequest().body(ResponseDTO.error("El contenido de la publicación no está permitido en la plataforma"));
        BlogEntrada e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("No encontrado"));
        boolean wasDraft = !Boolean.TRUE.equals(e.getPublicado());
        copiarTexto(e, datos);
        e.setPublicado(datos.publicado());
        if (Boolean.TRUE.equals(datos.publicado()) && wasDraft) {
            e.setFechaPublicacion(LocalDateTime.now(Constants.ZONA_CR));
        }
        return ResponseEntity.ok(ResponseDTO.success("Actualizado", repo.save(e)));
    }

    private boolean textoPermitido(BlogEntradaDatos datos) {
        return textModerationService.moderar(datos.titulo(), datos.resumen(), datos.contenido()).safe();
    }

    private void copiarTexto(BlogEntrada e, BlogEntradaDatos datos) {
        e.setTitulo(datos.titulo() == null ? null : sanitizer.cleanWithLimit(datos.titulo(), 200));
        e.setResumen(datos.resumen() == null ? null : sanitizer.cleanWithLimit(datos.resumen(), 400));
        e.setContenido(datos.contenido() == null ? null : sanitizer.cleanRichText(datos.contenido()));
        e.setImagenUrl(datos.imagenUrl() == null ? null : sanitizer.cleanWithLimit(datos.imagenUrl(), 500));
        if (datos.slug() != null && !datos.slug().isBlank()) e.setSlug(sanitizer.cleanSlug(datos.slug()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        BlogEntrada e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("No encontrado"));
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
            .replaceAll("(^-)|(-$)", "");
    }
}
