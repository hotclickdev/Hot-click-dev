package com.hotclick.controller;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.CarritoAbandonado;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.CarritoAbandonadoService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CarritoAbandonadoController {

    private static final Logger log = LoggerFactory.getLogger(CarritoAbandonadoController.class);

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
     * Recupera el carrito con el token del email. El ID secuencial no alcanza.
     * No se devuelve sessionId: eso permitiría borrar el carrito vía DELETE.
     */
    @GetMapping("/abandoned/recover/{token}")
    public ResponseEntity<ResponseDTO> recuperar(@PathVariable String token) {
        return service.findByTokenRecuperacion(token)
            .map(c -> {
                List<CarritoAbandonadoRequestDTO.CartItemDTO> items = service.deserializarItems(c.getItems());
                Map<String, Object> body = Map.of(
                    "id",     c.getId(),
                    "status", c.getStatus(),
                    "items",  items
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
     * Requires the sessionId that originally created the cart OR an authenticated
     * user whose userId matches the cart owner — prevents IDOR enumeration/deletion.
     */
    @DeleteMapping("/abandoned/{id}")
    public ResponseEntity<ResponseDTO> eliminar(
            @PathVariable Long id,
            @RequestParam(required = false) String sessionId,
            HttpServletRequest request) {

        return service.findById(id).map(cart -> {
            boolean ownedBySession = sessionId != null && sessionId.equals(cart.getSessionId());
            Long callerUserId = extractUserId(request);
            boolean ownedByUser = callerUserId != null && callerUserId.equals(cart.getUserId());

            if (!ownedBySession && !ownedByUser) {
                return ResponseEntity.status(403)
                    .body(ResponseDTO.error("No tenés permiso para eliminar este carrito"));
            }
            service.eliminar(id);
            return ResponseEntity.ok(ResponseDTO.success("Eliminado", null));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Quien tiene el token del email puede descartar el carrito recuperado. */
    @DeleteMapping("/abandoned/recover/{token}")
    public ResponseEntity<ResponseDTO> eliminarPorToken(@PathVariable String token) {
        return service.findByTokenRecuperacion(token)
            .map(cart -> {
                service.eliminar(cart.getId());
                return ResponseEntity.ok(ResponseDTO.success("Eliminado", null));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Long extractUserId(HttpServletRequest request) {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                return jwtUtil.extractUserId(header.substring(7));
            }
        } catch (Exception e) { log.warn("error: {}", e.getMessage()); }
        return null;
    }
}
