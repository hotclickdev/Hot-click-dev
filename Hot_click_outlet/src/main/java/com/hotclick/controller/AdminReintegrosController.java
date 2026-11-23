package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.reintegro.ReintegroPlataformaService;
import com.hotclick.service.reintegro.ReintegroPlataformaService.Resultado;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Saldo por reintegrar a los negocios (cobros que cayeron a la cuenta principal de HotClick). Solo ADMIN de plataforma:
 * ningún negocio ve esto. GET lista por negocio; POST marca reintegrado (por pago o por negocio), idempotente y auditado.
 */
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/admin/reintegros")
public class AdminReintegrosController {

    public record MarcarRequest(String nota) {}

    private final ReintegroPlataformaService service;

    public AdminReintegrosController(ReintegroPlataformaService service) { this.service = service; }

    @GetMapping
    public ResponseDTO listar() {
        return ResponseDTO.success("Saldo por reintegrar", service.resumenPorNegocio());
    }

    @PostMapping("/pagos/{pagoId}/reintegrado")
    public ResponseEntity<ResponseDTO> marcarPago(@PathVariable Long pagoId, @RequestBody(required = false) MarcarRequest body,
                                                  Authentication auth) {
        Resultado r = service.marcarReintegrado(pagoId, auth == null ? null : auth.getName(), body == null ? null : body.nota());
        return switch (r) {
            case MARCADO -> ResponseEntity.ok(ResponseDTO.success("Marcado como reintegrado", Map.of("estado", "REINTEGRADO")));
            case YA_REINTEGRADO -> ResponseEntity.ok(ResponseDTO.success("Ya estaba reintegrado", Map.of("estado", "REINTEGRADO")));
            case NO_APLICA -> ResponseEntity.status(409).body(ResponseDTO.error("Este cobro no tiene saldo por reintegrar"));
        };
    }

    @PostMapping("/negocios/{empresaId}/reintegrado")
    public ResponseEntity<ResponseDTO> marcarNegocio(@PathVariable Long empresaId, @RequestBody(required = false) MarcarRequest body,
                                                     Authentication auth) {
        int n = service.marcarReintegradoNegocio(empresaId, auth == null ? null : auth.getName(), body == null ? null : body.nota());
        return ResponseEntity.ok(ResponseDTO.success("Cobros marcados como reintegrados", Map.of("marcados", n)));
    }
}
