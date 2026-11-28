package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioAdminService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** Facturas que los negocios le emiten a HotClick. Solo ADMIN de plataforma (el servicio rechaza la impersonación). */
@RestController
@RequestMapping("/api/admin/facturas-negocio")
public class AdminFacturaNegocioController {

    private final FacturaNegocioAdminService admin;

    public AdminFacturaNegocioController(FacturaNegocioAdminService admin) { this.admin = admin; }

    /** Paginado (PageRequest en el servicio, máximo 100 por página). */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> listar(@RequestParam(required = false) String estado,
                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "50") int size) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Facturas de negocios", admin.listar(estado, desde, page, size)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Factura del negocio", admin.detalle(id)));
    }

    @PostMapping("/{id}/revisada")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> revisada(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Marcada como revisada", admin.marcarRevisada(id)));
    }

    @PostMapping("/{id}/recordar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> recordar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Recordatorio enviado", admin.recordar(id)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Genera a mano la quincena cerrada (idempotente) y marca las vencidas. */
    @PostMapping("/generar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> generar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(ResponseDTO.success("Generación de la quincena", admin.generar(fecha)));
    }
}
