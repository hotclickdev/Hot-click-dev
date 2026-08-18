package com.hotclick.controller;

import com.hotclick.controller.producto.ProductoCatalogHandler;
import com.hotclick.controller.producto.ProductoWriteHandler;
import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    @Autowired private ProductoCatalogHandler catalogHandler;
    @Autowired private ProductoWriteHandler   writeHandler;

    @GetMapping
    public ResponseEntity<ResponseDTO> listarProductos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return catalogHandler.listarProductos(page, size);
    }

    @GetMapping("/admin/todos")
    public ResponseEntity<ResponseDTO> listarTodosAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return catalogHandler.listarTodosAdmin(page, size);
    }

    @GetMapping("/pos/categorias")
    public ResponseEntity<ResponseDTO> categoriasPOS() {
        return catalogHandler.categoriasPOS();
    }

    @GetMapping("/pos/categoria/{catId}")
    public ResponseEntity<ResponseDTO> porCategoriaPOS(@PathVariable Long catId) {
        return catalogHandler.porCategoriaPOS(catId);
    }

    @GetMapping("/buscar")
    public ResponseEntity<ResponseDTO> buscar(@RequestParam String q) {
        return catalogHandler.buscar(q);
    }

    @GetMapping("/{id}/kardex")
    public ResponseEntity<ResponseDTO> kardex(@PathVariable Long id) {
        return catalogHandler.kardex(id);
    }

    @GetMapping("/destacados")
    public ResponseEntity<ResponseDTO> listarDestacados() {
        return catalogHandler.listarDestacados();
    }

    @GetMapping("/carrusel")
    public ResponseEntity<ResponseDTO> listarCarrusel() {
        return catalogHandler.listarCarrusel();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/carrusel")
    public ResponseEntity<ResponseDTO> toggleCarrusel(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return writeHandler.toggleCarrusel(id, body);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/destacado")
    public ResponseEntity<ResponseDTO> toggleDestacado(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        return writeHandler.toggleDestacado(id, body);
    }

    @GetMapping("/{id}/recomendaciones")
    public ResponseEntity<ResponseDTO> recomendaciones(
            @PathVariable Long id,
            @RequestParam(defaultValue = "6") int limit) {
        return catalogHandler.recomendaciones(id, limit);
    }

    @GetMapping("/marca/{marcaId}")
    public ResponseEntity<ResponseDTO> listarPorMarca(
            @PathVariable Long marcaId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return catalogHandler.listarPorMarca(marcaId, page, size);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerProducto(@PathVariable Long id) {
        return catalogHandler.obtenerProducto(id);
    }

    @GetMapping("/{id}/variantes")
    public ResponseEntity<ResponseDTO> obtenerVariantes(@PathVariable Long id) {
        return catalogHandler.obtenerVariantes(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> crearProducto(
            @RequestBody @Valid ProductoRequestDTO dto,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey) {
        return writeHandler.crearProducto(dto, idempotencyKey);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> actualizarProducto(
            @PathVariable Long id,
            @RequestBody ProductoRequestDTO dto) {
        return writeHandler.actualizarProducto(id, dto);
    }

    @PostMapping("/archivar-sin-stock")
    @Transactional
    public ResponseEntity<ResponseDTO> archivarSinStock() {
        return writeHandler.archivarSinStock();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/ajustar-precios")
    @Transactional
    public ResponseEntity<ResponseDTO> ajustarPrecios(@RequestBody Map<String, Double> body) {
        return writeHandler.ajustarPrecios(body);
    }

    @PostMapping("/bulk")
    public ResponseEntity<ResponseDTO> importarBulk(@RequestBody List<ProductoRequestDTO> dtos) {
        return writeHandler.importarBulk(dtos);
    }

    @PostMapping("/imagen")
    public ResponseEntity<ResponseDTO> subirImagen(@RequestParam("file") MultipartFile file) {
        return writeHandler.subirImagen(file);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> eliminarProducto(@PathVariable Long id) {
        return writeHandler.eliminarProducto(id);
    }

    @PatchMapping("/{id}/oferta")
    public ResponseEntity<ResponseDTO> aplicarOferta(@PathVariable Long id,
                                                      @RequestBody Map<String, Object> body) {
        return writeHandler.aplicarOferta(id, body);
    }

    @PostMapping("/oferta/categoria/{categoriaId}")
    @Transactional
    public ResponseEntity<ResponseDTO> aplicarOfertaCategoria(@PathVariable Long categoriaId,
                                                               @RequestBody Map<String, Object> body) {
        return writeHandler.aplicarOfertaCategoria(categoriaId, body);
    }

    @GetMapping("/en-oferta")
    public ResponseEntity<ResponseDTO> enOferta() {
        return catalogHandler.enOferta();
    }
}
