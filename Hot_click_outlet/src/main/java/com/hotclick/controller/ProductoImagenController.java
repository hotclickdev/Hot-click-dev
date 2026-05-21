package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ProductoImagenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/productos/{productoId}/imagenes")
public class ProductoImagenController {

    @Autowired
    private ProductoImagenService imagenService;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar(@PathVariable Long productoId) {
        return ResponseEntity.ok(ResponseDTO.success("Imágenes obtenidas",
            imagenService.listarPorProducto(productoId)));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> agregar(
            @PathVariable Long productoId,
            @RequestBody Map<String, Object> body) {
        try {
            String url = (String) body.get("urlImagen");
            int posicion = body.get("posicion") instanceof Number n ? n.intValue() : 0;
            boolean esPrincipal = Boolean.TRUE.equals(body.get("esPrincipal"));
            var img = imagenService.agregar(productoId, url, posicion, esPrincipal);
            return ResponseEntity.ok(ResponseDTO.success("Imagen agregada", img));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{imagenId}")
    public ResponseEntity<ResponseDTO> eliminar(
            @PathVariable Long productoId,
            @PathVariable Long imagenId) {
        try {
            imagenService.eliminar(imagenId, productoId);
            return ResponseEntity.ok(ResponseDTO.success("Imagen eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Reemplaza todas las imágenes de un producto de una vez. */
    @PutMapping
    public ResponseEntity<ResponseDTO> sincronizar(
            @PathVariable Long productoId,
            @RequestBody Map<String, List<String>> body) {
        try {
            List<String> urls = body.get("urls");
            if (urls == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo 'urls' requerido"));
            var imagenes = imagenService.sincronizar(productoId, urls);
            return ResponseEntity.ok(ResponseDTO.success("Imágenes sincronizadas", imagenes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
