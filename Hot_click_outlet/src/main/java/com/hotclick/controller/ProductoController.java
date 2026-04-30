package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Producto;
import com.hotclick.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    @GetMapping
    public ResponseEntity<ResponseDTO> listarProductos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var productos = productoService.listarProductosDisponibles(PageRequest.of(page, size));
        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", productos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerProducto(@PathVariable Long id) {
        try {
            Producto producto = productoService.buscarPorId(id);
            return ResponseEntity.ok(ResponseDTO.success("Producto encontrado", producto));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crearProducto(@RequestBody Producto producto) {
        try {
            Producto nuevoProducto = productoService.crearProducto(producto);
            return ResponseEntity.ok(ResponseDTO.success("Producto creado", nuevoProducto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizarProducto(@PathVariable Long id, @RequestBody Producto producto) {
        try {
            Producto actualizado = productoService.actualizarProducto(id, producto);
            return ResponseEntity.ok(ResponseDTO.success("Producto actualizado", actualizado));
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
