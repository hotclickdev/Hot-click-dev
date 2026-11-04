package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.reembolso.ReembolsoOnvoService;
import com.hotclick.service.reembolso.ReembolsoOnvoService.ReembolsoException;
import com.hotclick.service.reembolso.ReembolsoOnvoService.ResolucionManual;
import com.hotclick.service.reembolso.ReembolsoOnvoService.Resultado;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Reembolso de un pedido pagado por ONVO. Solo ADMIN de plataforma.
 * POST /api/admin/pedidos/{pedidoId}/reembolso-onvo → 200 reembolsado, 202 en proceso en ONVO,
 * POST .../reembolso-onvo/resolucion {resultado: DEVUELTO|NO_DEVUELTO, confirmado} → registra la revisión
 * manual en ONVO con usuario y fecha; DEVUELTO solo con confirmado=true.
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

    public record ResolucionRequest(String resultado, Boolean confirmado) {}

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/pedidos/{pedidoId}/reembolso-onvo/resolucion")
    public ResponseEntity<ResponseDTO> resolver(@PathVariable Long pedidoId, @RequestBody(required = false) ResolucionRequest body,
                                                Authentication auth) {
        ResolucionManual resolucion;
        try {
            resolucion = body == null || body.resultado() == null ? null : ResolucionManual.valueOf(body.resultado().trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            resolucion = null;
        }
        try {
            Resultado r = reembolsoOnvoService.resolverManual(pedidoId, resolucion,
                body != null && Boolean.TRUE.equals(body.confirmado()), auth == null ? null : auth.getName());
            return ResponseEntity.ok(ResponseDTO.success(r.mensaje(), Map.of(
                "pedidoId", pedidoId, "estadoPedido", r.estadoPedido(), "estadoPago", r.estadoPago())));
        } catch (ReembolsoException e) {
            return ResponseEntity.status(e.getStatus()).body(ResponseDTO.error(e.getMessage()));
        }
    }
}
