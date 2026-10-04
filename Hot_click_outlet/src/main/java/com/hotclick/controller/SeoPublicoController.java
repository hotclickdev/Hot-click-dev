package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.seo.SeoPublicoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/seo")
public class SeoPublicoController {

    private final SeoPublicoService seoPublicoService;

    public SeoPublicoController(SeoPublicoService seoPublicoService) {
        this.seoPublicoService = seoPublicoService;
    }

    @GetMapping("/tiendas")
    public ResponseEntity<ResponseDTO> tiendas() {
        return ResponseEntity.ok(ResponseDTO.success("Tiendas", seoPublicoService.tiendas()));
    }

    @GetMapping("/sectores")
    public ResponseEntity<ResponseDTO> sectores() {
        return ResponseEntity.ok(ResponseDTO.success("Sectores", seoPublicoService.sectores()));
    }

    @GetMapping("/sectores/{slug}")
    public ResponseEntity<ResponseDTO> sector(@PathVariable String slug) {
        return seoPublicoService.sector(slug)
            .map(sector -> ResponseEntity.ok(ResponseDTO.success("Sector", sector)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ResponseDTO.error("Sector no encontrado")));
    }

    @GetMapping("/provincias")
    public ResponseEntity<ResponseDTO> provincias() {
        return ResponseEntity.ok(ResponseDTO.success("Provincias", seoPublicoService.provincias()));
    }

    @GetMapping("/provincias/{slug}")
    public ResponseEntity<ResponseDTO> provincia(@PathVariable String slug) {
        return seoPublicoService.provincia(slug)
            .map(provincia -> ResponseEntity.ok(ResponseDTO.success("Provincia", provincia)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ResponseDTO.error("Provincia no encontrada")));
    }
}
