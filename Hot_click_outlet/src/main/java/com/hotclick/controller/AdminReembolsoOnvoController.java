package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.reembolso.ReembolsoOnvoService;
import com.hotclick.service.reembolso.ReembolsoOnvoService.ReembolsoException;
import com.hotclick.service.reembolso.ReembolsoOnvoService.Resultado;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Reembolso de un pedido pagado por ONVO. Solo ADMIN de plataforma.
 * POST /api/admin/pedidos/{pedidoId}/reembolso-onvo → 200 reembolsado, 202 en proceso en ONVO,
 * 409 no aplica (p. ej. pagado por fuera de la app: se cancela como siempre), 502 ONVO rechazó o no confirmó.
 */
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/admin")
public class AdminReembolsoOnvoController {

    private final ReembolsoOnvoService reembolsoOnvoService;

    public AdminReembolsoOnvoController(ReembolsoOnvoService reembolsoOnvoService) {
        this.reembolsoOnvoService = reembolsoOnvoService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/pedidos/{pedidoId}/reembolso-onvo")
    public ResponseEntity<ResponseDTO> reembolsar(@PathVariable Long pedidoId) {
        try {
            Resultado r = reembolsoOnvoService.reembolsar(pedidoId);
            return ResponseEntity.status(r.status()).body(ResponseDTO.success(r.mensaje(), Map.of(
                "pedidoId", pedidoId, "estadoPedido", r.estadoPedido(), "estadoPago", r.estadoPago())));
        } catch (ReembolsoException e) {
            return ResponseEntity.status(e.getStatus()).body(ResponseDTO.error(e.getMessage()));
        }
    }
}
