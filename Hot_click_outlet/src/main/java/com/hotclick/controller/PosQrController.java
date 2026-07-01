package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.PosQrService;
import com.hotclick.service.TurnoCajaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints para el flujo de pago QR desde el POS.
 * - Rutas autenticadas (/api/pos/qr): crean y gestionan sesiones.
 * - Rutas públicas (/api/pos/qr/pago): el cliente escanea el QR y paga.
 */
@RestController
@RequestMapping("/api/pos/qr")
public class PosQrController {

    @Autowired private PosQrService    posQrService;
    @Autowired private JwtUtil         jwtUtil;
    @Autowired private TurnoCajaService turnoCajaService;

    // ── AUTH: cajero crea sesión ────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> crearSesion(@RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        try {
            Long usuarioId  = extractUserId(request);
            Long empresaId  = extractEmpresaId(request);
            String metodo   = (String) body.getOrDefault("metodoPago", "TARJETA");
            @SuppressWarnings("unchecked")
            var items = (java.util.List<Map<String, Object>>) body.get("items");
            String notas    = (String) body.get("notas");

            Long turnoId = turnoCajaService.getTurnoActivo(usuarioId)
                .map(t -> t.getId()).orElse(null);

            PosQrSesion sesion = posQrService.crearSesion(
                usuarioId, empresaId, turnoId, metodo, items, notas);

            return ResponseEntity.ok(ResponseDTO.success("QR generado", Map.of(
                "token",      sesion.getToken(),
                "total",      sesion.getTotal(),
                "metodoPago", sesion.getMetodoPago(),
                "expiracion", sesion.getFechaExpiracion().toString()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{token}/confirmar-sinpe")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> confirmarSinpe(@PathVariable String token,
                                             @RequestBody(required = false) Map<String, Object> body,
                                             HttpServletRequest request) {
        try {
            Long usuarioId = extractUserId(request);
            Long empresaId = extractEmpresaId(request);
            String notas   = body != null ? (String) body.get("notas") : null;
            PosQrSesion sesion = posQrService.confirmarSinpe(token, usuarioId, empresaId, notas);
            return ResponseEntity.ok(ResponseDTO.success("SINPE confirmado", Map.of(
                "estado",    sesion.getEstado(),
                "pedidoId",  sesion.getPedidoId() != null ? sesion.getPedidoId() : 0
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{token}")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> cancelar(@PathVariable String token, HttpServletRequest request) {
        try {
            Long empresaId = extractEmpresaId(request);
            posQrService.cancelar(token, empresaId);
            return ResponseEntity.ok(ResponseDTO.success("Sesión cancelada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── PÚBLICO: el cliente escanea el QR ──────────────────────

    /** Info de la sesión para mostrar al cliente (productos + total + método). */
    @GetMapping("/pago/{token}")
    public ResponseEntity<?> infoPublica(@PathVariable String token) {
        try {
            return ResponseEntity.ok(posQrService.getInfoPublica(token));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "QR no encontrado o expirado"));
        }
    }

    /** Cliente crea sesión de pago Stripe y recibe la URL de checkout. */
    @PostMapping("/pago/{token}/stripe")
    public ResponseEntity<?> iniciarStripe(@PathVariable String token) {
        try {
            String checkoutUrl = posQrService.crearStripeCheckout(token);
            return ResponseEntity.ok(Map.of("checkoutUrl", checkoutUrl));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "QR no encontrado"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Error al iniciar pago: " + e.getMessage()));
        }
    }

    /** Polling de estado — cajero y cliente consultan si el pago está confirmado. */
    @GetMapping("/pago/{token}/estado")
    public ResponseEntity<?> estado(@PathVariable String token) {
        try {
            String estado = posQrService.verificarEstado(token);
            return ResponseEntity.ok(Map.of("estado", estado));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Sesión no encontrada"));
        }
    }

    // ── helpers ────────────────────────────────────────────────

    private Long extractUserId(HttpServletRequest req) {
        return jwtUtil.extractUserId(req.getHeader("Authorization").substring(7));
    }

    private Long extractEmpresaId(HttpServletRequest req) {
        Long id = jwtUtil.extractEmpresaId(req.getHeader("Authorization").substring(7));
        if (id == null) throw new IllegalStateException("No hay empresa en el token");
        return id;
    }
}
