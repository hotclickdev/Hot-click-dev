package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Carrito;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.CarritoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/carrito")
public class CarritoController {

    @Autowired
    private CarritoService carritoService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping("/{usuarioId}")
    public ResponseEntity<ResponseDTO> obtenerCarrito(@PathVariable Long usuarioId) {
        try {
            Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            Carrito carrito = carritoService.obtenerCarritoActivo(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Carrito obtenido", carrito));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{carritoId}/items")
    public ResponseEntity<ResponseDTO> agregarItem(
            @PathVariable Long carritoId,
            @RequestParam Long productoId,
            @RequestParam(defaultValue = "1") Integer cantidad) {
        try {
            Carrito carrito = carritoService.agregarItem(carritoId, productoId, cantidad);
            return ResponseEntity.ok(ResponseDTO.success("Item agregado al carrito", carrito));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{carritoId}/vaciar")
    public ResponseEntity<ResponseDTO> vaciarCarrito(@PathVariable Long carritoId) {
        try {
            carritoService.vaciarCarrito(carritoId);
            return ResponseEntity.ok(ResponseDTO.success("Carrito vaciado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
