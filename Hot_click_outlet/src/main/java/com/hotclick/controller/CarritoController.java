package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Carrito;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CarritoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.CarritoService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/carrito")
public class CarritoController {

    @Autowired
    private CarritoService carritoService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CarritoRepository carritoRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/{usuarioId}")
    public ResponseEntity<ResponseDTO> obtenerCarrito(@PathVariable Long usuarioId,
                                                       HttpServletRequest request) {
        try {
            Long userId = extractUserId(request);
            if (!userId.equals(usuarioId)) {
                return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
            }
            Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
            Carrito carrito = carritoService.obtenerCarritoActivo(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Carrito obtenido", carrito));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{carritoId}/items")
    public ResponseEntity<ResponseDTO> agregarItem(
            @PathVariable Long carritoId,
            @RequestParam Long productoId,
            @RequestParam(defaultValue = "1") Integer cantidad,
            HttpServletRequest request) {
        try {
            Long userId = extractUserId(request);
            Carrito carrito = carritoRepository.findById(carritoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Carrito no encontrado"));
            if (!carrito.getUsuarioFinal().getId().equals(userId)) {
                return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
            }
            Carrito actualizado = carritoService.agregarItem(carritoId, productoId, cantidad);
            return ResponseEntity.ok(ResponseDTO.success("Item agregado al carrito", actualizado));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{carritoId}/vaciar")
    public ResponseEntity<ResponseDTO> vaciarCarrito(@PathVariable Long carritoId,
                                                      HttpServletRequest request) {
        try {
            Long userId = extractUserId(request);
            Carrito carrito = carritoRepository.findById(carritoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Carrito no encontrado"));
            if (!carrito.getUsuarioFinal().getId().equals(userId)) {
                return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
            }
            carritoService.vaciarCarrito(carritoId);
            return ResponseEntity.ok(ResponseDTO.success("Carrito vaciado", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    private Long extractUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new SecurityException("Token de autenticación requerido");
        }
        return jwtUtil.extractUserId(auth.substring(7));
    }
}
