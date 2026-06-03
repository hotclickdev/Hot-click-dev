package com.hotclick.controller;

import com.hotclick.service.SelfCheckoutService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Endpoints públicos del terminal de autoservicio.
 * No requieren autenticación — la identidad de la mesa se verifica via qrToken.
 * Rutas bajo /api/qr/{token}.
 */
@RestController
@RequestMapping("/api/qr")
public class SelfCheckoutController {

    private static final Logger log = LoggerFactory.getLogger(SelfCheckoutController.class);

    private final SelfCheckoutService selfCheckoutService;

    public SelfCheckoutController(SelfCheckoutService selfCheckoutService) {
        this.selfCheckoutService = selfCheckoutService;
    }

    /** Info de la mesa + branding de la empresa. */
    @GetMapping("/{token}")
    public ResponseEntity<Map<String, Object>> getMesaInfo(@PathVariable String token) {
        try {
            return ResponseEntity.ok(selfCheckoutService.getMesaInfo(token));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    /** Catálogo de productos activos de la empresa. */
    @GetMapping("/{token}/productos")
    public ResponseEntity<List<Map<String, Object>>> getCatalogo(@PathVariable String token) {
        try {
            return ResponseEntity.ok(selfCheckoutService.getCatalogo(token));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(null);
        }
    }

    /** Crear pedido desde autoservicio. */
    @PostMapping("/{token}/pedido")
    public ResponseEntity<Map<String, Object>> crearPedido(
            @PathVariable String token,
            @RequestBody Map<String, Object> body) {
        try {
            String clienteNombre = (String) body.get("clienteNombre");
            String clienteTel    = (String) body.get("clienteTel");
            String notas         = (String) body.get("notas");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");

            if (items == null || items.isEmpty())
                return ResponseEntity.badRequest().body(Map.of("error", "El pedido debe tener al menos un producto"));

            Map<String, Object> result = selfCheckoutService.crearPedido(
                token, clienteNombre, clienteTel, notas, items);
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[self-checkout] Error creando pedido token={}: {}", token, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Error al procesar el pedido"));
        }
    }
}
