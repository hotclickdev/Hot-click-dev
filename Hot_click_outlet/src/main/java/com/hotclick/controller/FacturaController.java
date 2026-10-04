package com.hotclick.controller;

import com.hotclick.dto.ComprobanteEmitido;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.service.FacturacionService;
import com.hotclick.service.facturacion.FacturaConsultaService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/facturas")
public class FacturaController {

    private final FacturacionService facturacionService;
    private final FacturaConsultaService consultaService;

    public FacturaController(FacturacionService facturacionService,
                              FacturaConsultaService consultaService) {
        this.facturacionService = facturacionService;
        this.consultaService = consultaService;
    }

    /**
     * Inicia la emisión de un comprobante para un pedido.
     * Retorna inmediatamente con estado PENDIENTE; el envío es asíncrono.
     *
     * Body opcional: { "tipo": "01" | "04" }
     * Default: "04" (Tiquete Electrónico — no requiere datos del receptor)
     */
    @PostMapping("/emitir/{pedidoId}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ComprobanteFiscal> emitir(
            @PathVariable Long pedidoId,
            @RequestBody(required = false) Map<String, String> body) {

        String tipo = (body != null) ? body.get("tipo") : null;
        ComprobanteFiscal cf = facturacionService.emitir(pedidoId, tipo);
        return ResponseEntity.accepted().body(cf);
    }

    /**
     * Lista comprobantes de la empresa autenticada con paginación.
     * Filtros opcionales por estado y rango de fecha de emisión (fechaDesde/fechaHasta
     * son solo fecha; fechaHasta se extiende a fin de día para incluir todo el día).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<Page<ComprobanteEmitido>> listar(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta) {
        return ResponseEntity.ok(consultaService.listar(page, size, estado, fechaDesde, fechaHasta));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ComprobanteEmitido> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(consultaService.detalle(id));
    }

    @GetMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ComprobanteEmitido> estado(@PathVariable Long id) {
        return ResponseEntity.ok(consultaService.detalle(id));
    }
}
