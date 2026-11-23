package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.retiro.PedidoRetiroTokenService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Retiro en tienda de pedidos pagados por Telegram.
 * - {@code POST /api/pos/retiro-telegram/canjear}: AUTENTICADO (caja de la misma empresa). Un solo uso.
 * - {@code GET /api/public/retiro/{token}}: público; solo estado y nombre de la tienda (sin ítems ni datos personales).
 */
@RestController
public class PedidoRetiroController {

    private static final Logger log = LoggerFactory.getLogger(PedidoRetiroController.class);
    static final String MSG_NO_VALIDO = "Este código no es válido, ya se usó o venció.";

    @Autowired private PedidoRetiroTokenService retiroService;
    @Autowired private JwtUtil jwtUtil;

    @PostMapping("/api/pos/retiro-telegram/canjear")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> canjear(@RequestBody Map<String, String> body, HttpServletRequest request) {
        try {
            String jwt = request.getHeader("Authorization").substring(7);
            Long empresaId = jwtUtil.extractEmpresaId(jwt);
            Long usuarioId = jwtUtil.extractUserId(jwt);
            var canje = retiroService.canjear(body == null ? null : body.get("codigo"), empresaId, usuarioId);
            if (!canje.valido()) {
                // 404 uniforme: no distingue inexistente / usado / vencido / de otra empresa y no trae ítems.
                return ResponseEntity.status(404).body(ResponseDTO.error(MSG_NO_VALIDO));
            }
            return ResponseEntity.ok(ResponseDTO.success("Pedido entregado", canje));
        } catch (Exception e) {
            log.warn("[retiro-qr] canje falló: {}", e.getClass().getSimpleName());
            return ResponseEntity.status(409).body(ResponseDTO.error("No se pudo entregar este pedido. Revisalo en Pedidos."));
        }
    }

    @GetMapping("/api/public/retiro/{token}")
    public ResponseEntity<?> info(@PathVariable String token) {
        return ResponseEntity.ok(retiroService.infoPublica(token));
    }
}
