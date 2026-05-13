package com.hotclick.controller;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ProductoService;
import com.hotclick.service.SupabaseStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @GetMapping
    public ResponseEntity<ResponseDTO> listarProductos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var productos = productoService.listarProductosDisponibles(PageRequest.of(page, size));
        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", productos));
    }

    @GetMapping("/admin/todos")
    public ResponseEntity<ResponseDTO> listarTodosAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "200") int size) {
        var productos = productoService.listarTodosActivos(PageRequest.of(page, size));
        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", productos));
    }

    @GetMapping("/destacados")
    public ResponseEntity<ResponseDTO> listarDestacados() {
        return ResponseEntity.ok(ResponseDTO.success("Destacados obtenidos", productoService.listarDestacados()));
    }

    @PatchMapping("/{id}/destacado")
    public ResponseEntity<ResponseDTO> toggleDestacado(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        try {
            Boolean valor = body.get("destacado");
            if (valor == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo destacado requerido"));
            var producto = productoService.toggleDestacado(id, valor);
            return ResponseEntity.ok(ResponseDTO.success("Destacado actualizado", producto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerProducto(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Producto encontrado", productoService.buscarPorId(id)));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crearProducto(
            @RequestBody ProductoRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            var producto = productoService.crearProducto(dto, userDetails.getUsername());
            return ResponseEntity.ok(ResponseDTO.success("Producto creado", producto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizarProducto(
            @PathVariable Long id,
            @RequestBody ProductoRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            var producto = productoService.actualizarProducto(id, dto, userDetails.getUsername());
            return ResponseEntity.ok(ResponseDTO.success("Producto actualizado", producto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/imagen")
    public ResponseEntity<ResponseDTO> subirImagen(@RequestParam("file") MultipartFile file) {
        try {
            String url = supabaseStorageService.subirImagen(file);
            return ResponseEntity.ok(ResponseDTO.success("Imagen subida", Map.of("url", url)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminarProducto(@PathVariable Long id) {
        try {
            productoService.eliminarProducto(id);
            return ResponseEntity.ok(ResponseDTO.success("Producto eliminado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
