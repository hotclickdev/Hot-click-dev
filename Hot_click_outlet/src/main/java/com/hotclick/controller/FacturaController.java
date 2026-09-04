package com.hotclick.controller;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.FacturacionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/facturas")
public class FacturaController {

    private final FacturacionService facturacionService;
    private final ComprobanteFiscalRepository comprobanteRepo;
    private final CompanyScope companyScope;

    public FacturaController(FacturacionService facturacionService,
                              ComprobanteFiscalRepository comprobanteRepo,
                              CompanyScope companyScope) {
        this.facturacionService = facturacionService;
        this.comprobanteRepo    = comprobanteRepo;
        this.companyScope       = companyScope;
    }

    /**
     * Inicia la emisión de un comprobante para un pedido.
     * Retorna inmediatamente con estado PENDIENTE; el envío es asíncrono.
     *
     * Body opcional: { "tipo": "01" | "04" }
     * Default: "04" (Tiquete Electrónico — no requiere datos del receptor)
     */
    @PostMapping("/emitir/{pedidoId}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','CONTABILIDAD')")
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
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','CONTABILIDAD')")
    public ResponseEntity<Page<ComprobanteFiscal>> listar(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta) {

        Long empresaId = companyScope.getCurrentEmpresaId();
        LocalDateTime desde = fechaDesde != null ? fechaDesde.atStartOfDay() : null;
        LocalDateTime hasta = fechaHasta != null ? fechaHasta.atTime(23, 59, 59) : null;
        Page<ComprobanteFiscal> pagina = comprobanteRepo.findByEmpresaIdConFiltros(
            empresaId, estado, desde, hasta,
            PageRequest.of(page, size, Sort.by("fechaEmision").descending())
        );
        return ResponseEntity.ok(pagina);
    }

    /**
     * Detalle de un comprobante por ID — verifica que pertenece al tenant.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','CONTABILIDAD')")
    public ResponseEntity<ComprobanteFiscal> detalle(@PathVariable Long id) {
        ComprobanteFiscal cf = comprobanteRepo.findById(id)
            .orElseThrow(() -> new java.util.NoSuchElementException("Comprobante no encontrado: " + id));
        companyScope.assertCanAccess(cf.getEmpresa().getId());
        return ResponseEntity.ok(cf);
    }

    /**
     * Estado actual del comprobante (para polling del frontend).
     */
    @GetMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','CONTABILIDAD')")
    public ResponseEntity<Map<String, Object>> estado(@PathVariable Long id) {
        ComprobanteFiscal cf = comprobanteRepo.findById(id)
            .orElseThrow(() -> new java.util.NoSuchElementException("Comprobante no encontrado: " + id));
        companyScope.assertCanAccess(cf.getEmpresa().getId());
        return ResponseEntity.ok(Map.of(
            "id",               cf.getId(),
            "estado",           cf.getEstado(),
            "ambiente",         cf.getAmbiente(),
            "claveNumerica",    cf.getClaveNumerica(),
            "intentosEnvio",    cf.getIntentosEnvio(),
            "mensajeHacienda",  cf.getMensajeHacienda() != null ? cf.getMensajeHacienda() : ""
        ));
    }
}
