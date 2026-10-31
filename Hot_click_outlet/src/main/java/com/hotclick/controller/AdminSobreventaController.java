package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.service.payment.SobreventaResolucionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Seguimiento MED-2: salida de REVISION_SOBREVENTA. Solo ADMIN (ni FINANCE ni negocio); auditada con
 * actor y motivo. No reembolsa ni llama a procesadores: solo registra la decisión.
 * POST /api/admin/sobreventa/pedidos/{id}/resolver  {"accion":"CANCELAR|REEMBOLSO_PROCESADO","motivo":"..."}
 */
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/admin/sobreventa")
public class AdminSobreventaController {

    @Autowired private SobreventaResolucionService resolucionService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/pedidos/{id}/resolver")
    public ResponseEntity<ResponseDTO> resolver(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Pedido pedido = resolucionService.resolver(id, body.get("accion"), body.get("motivo"));
        return ResponseEntity.ok(ResponseDTO.success("Sobreventa resuelta", Map.of(
            "pedidoId", pedido.getId(),
            "estadoPedido", pedido.getEstadoPedido())));
    }
}
