package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.TicketSoporteUpdateRequest;
import com.hotclick.service.TicketSoporteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Inbox de soporte para staff de plataforma: listar, asignar, resolver.
 */
@RestController
@RequestMapping("/api/admin/soporte/tickets")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('global.companies')")
public class AdminTicketSoporteController {

    private final TicketSoporteService ticketSoporteService;

    public AdminTicketSoporteController(TicketSoporteService ticketSoporteService) {
        this.ticketSoporteService = ticketSoporteService;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar(
            @RequestParam(required = false) Long empresaId,
            @RequestParam(required = false) String estado) {
        return ResponseEntity.ok(ResponseDTO.success(
            "Tickets de soporte",
            ticketSoporteService.listarAdmin(empresaId, estado)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody TicketSoporteUpdateRequest body) {
        return ResponseEntity.ok(ResponseDTO.success(
            "Ticket actualizado",
            ticketSoporteService.actualizarAdmin(id, body)));
    }
}
