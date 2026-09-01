package com.hotclick.controller;

import com.hotclick.dto.EncargoAprobarRequest;
import com.hotclick.dto.EncargoFulfillmentRequest;
import com.hotclick.dto.EncargoRechazarRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.EncargoPersonalizado;
import com.hotclick.service.EncargoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/encargos")
public class EncargoAdminController {

    @Autowired private EncargoService encargoService;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar(@RequestParam(required = false) String estado) {
        List<EncargoPersonalizado> lista = encargoService.listarDelTenant(estado);
        return ResponseEntity.ok(ResponseDTO.success("Encargos obtenidos", lista));
    }

    @GetMapping("/kpis")
    public ResponseEntity<ResponseDTO> kpis() {
        return ResponseEntity.ok(ResponseDTO.success("KPIs de encargos", encargoService.kpisDelTenant().toMap()));
    }

    @GetMapping("/{id}/eventos")
    public ResponseEntity<ResponseDTO> eventos(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Eventos del encargo", encargoService.eventosDeEncargo(id)));
    }

    @PutMapping("/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(
            @PathVariable Long id,
            @Valid @RequestBody EncargoAprobarRequest req) {
        try {
            EncargoPersonalizado encargo = encargoService.aprobar(id, req);
            return ResponseEntity.ok(ResponseDTO.success("Encargo aprobado", encargo));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(
            @PathVariable Long id,
            @Valid @RequestBody EncargoRechazarRequest req) {
        try {
            EncargoPersonalizado encargo = encargoService.rechazar(id, req);
            return ResponseEntity.ok(ResponseDTO.success("Encargo rechazado", encargo));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/fulfillment")
    public ResponseEntity<ResponseDTO> fulfillment(
            @PathVariable Long id,
            @Valid @RequestBody EncargoFulfillmentRequest req) {
        try {
            EncargoPersonalizado encargo = encargoService.actualizarFulfillment(id, req);
            return ResponseEntity.ok(ResponseDTO.success("Fulfillment actualizado", encargo));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
