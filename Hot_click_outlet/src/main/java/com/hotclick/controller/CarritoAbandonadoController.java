package com.hotclick.controller;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.CarritoAbandonado;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.CarritoAbandonadoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CarritoAbandonadoController {

    @Autowired private CarritoAbandonadoService service;
    @Autowired private JwtUtil jwtUtil;

    /**
     * Saves or updates the abandoned cart for a session.
     * Public — works for anonymous and authenticated users.
     */
    @PostMapping("/abandoned")
    public ResponseEntity<ResponseDTO> guardar(
            @RequestBody CarritoAbandonadoRequestDTO dto,
            HttpServletRequest request) {

        if (dto.getSessionId() == null || dto.getSessionId().isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("sessionId requerido"));
        }
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("items vacíos"));
        }

        Long userId = extractUserId(request);
        CarritoAbandonado saved = service.guardar(dto, userId);
        return ResponseEntity.ok(ResponseDTO.success("Carrito guardado", saved.getId()));
    }

    /**
     * Returns items for a cart recovery link (email click).
     * Public — the email link does not carry a JWT.
     */
    @GetMapping("/abandoned/recover/{id}")
    public ResponseEntity<ResponseDTO> recuperar(@PathVariable Long id) {
        return service.findById(id)
            .map(c -> {
                List<CarritoAbandonadoRequestDTO.CartItemDTO> items = service.deserializarItems(c.getItems());
                Map<String, Object> body = Map.of(
                    "id",        c.getId(),
                    "sessionId", c.getSessionId(),
                    "status",    c.getStatus(),
                    "items",     items
                );
                return ResponseEntity.ok(ResponseDTO.success("ok", body));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Checks if there is a PENDIENTE cart for a given session.
     * Called by the frontend after login to offer cart restoration.
     */
    @GetMapping("/abandoned/session/{sessionId}")
    public ResponseEntity<ResponseDTO> porSession(@PathVariable String sessionId) {
        return service.findPendienteBySession(sessionId)
            .map(c -> {
                List<CarritoAbandonadoRequestDTO.CartItemDTO> items = service.deserializarItems(c.getItems());
                Map<String, Object> body = Map.of("id", c.getId(), "items", items);
                return ResponseEntity.ok(ResponseDTO.success("ok", body));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Marks the cart as recovered and removes it (called after successful restore).
     */
    @DeleteMapping("/abandoned/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.ok(ResponseDTO.success("Eliminado", null));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Long extractUserId(HttpServletRequest request) {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                return jwtUtil.extractUserId(header.substring(7));
            }
        } catch (Exception ignored) { }
        return null;
    }
}
