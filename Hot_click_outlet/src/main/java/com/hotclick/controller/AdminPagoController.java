package com.hotclick.controller;

import com.hotclick.dto.PagoResumenDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.WebhookEventResumenDTO;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/admin")
public class AdminPagoController {

    @Autowired private PagoRepository         pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    /**
     * Lista pagos con filtros opcionales de proveedor y estadoPago.
     * GET /api/admin/pagos?proveedor=PAYPAL&estadoPago=CAPTURADO&page=0&size=20
     */
    @GetMapping("/pagos")
    public ResponseEntity<ResponseDTO> listarPagos(
            @RequestParam(required = false) String proveedor,
            @RequestParam(required = false) String estadoPago,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<?> resultado = pagoRepository
            .buscarPagos(proveedor, estadoPago, pageable)
            .map(PagoResumenDTO::from);

        return ResponseEntity.ok(ResponseDTO.success("Pagos", Map.of(
            "content",       resultado.getContent(),
            "totalElements", resultado.getTotalElements(),
            "totalPages",    resultado.getTotalPages(),
            "page",          resultado.getNumber()
        )));
    }

    /**
     * Lista webhook events con filtro opcional de estado procesado.
     * GET /api/admin/webhooks?procesado=false&page=0&size=20
     */
    @GetMapping("/webhooks")
    public ResponseEntity<ResponseDTO> listarWebhooks(
            @RequestParam(required = false) Boolean procesado,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<?> resultado = webhookEventRepository
            .buscarWebhooks(procesado, pageable)
            .map(WebhookEventResumenDTO::from);

        return ResponseEntity.ok(ResponseDTO.success("Webhooks", Map.of(
            "content",       resultado.getContent(),
            "totalElements", resultado.getTotalElements(),
            "totalPages",    resultado.getTotalPages(),
            "page",          resultado.getNumber()
        )));
    }

    /**
     * KPIs rápidos de pagos.
     * GET /api/admin/pagos/kpis
     */
    @GetMapping("/pagos/kpis")
    public ResponseEntity<ResponseDTO> kpis() {
        long total      = pagoRepository.count();
        long capturados = pagoRepository.countByEstadoPago("CAPTURADO");
        long pendientes = pagoRepository.countByEstadoPago("PENDIENTE");
        long fallidos   = pagoRepository.countByEstadoPago("FALLIDO");
        long paypal     = pagoRepository.countByProveedor("PAYPAL");
        long payxpert   = pagoRepository.countByProveedor("PAYXPERT");
        long webhooksErr= webhookEventRepository.countByProcesado(false);

        double tasaExito = total > 0 ? Math.round((double) capturados / total * 1000.0) / 10.0 : 0.0;

        return ResponseEntity.ok(ResponseDTO.success("KPIs", Map.of(
            "total",       total,
            "capturados",  capturados,
            "pendientes",  pendientes,
            "fallidos",    fallidos,
            "paypal",      paypal,
            "payxpert",    payxpert,
            "tasaExito",   tasaExito,
            "webhooksErr", webhooksErr
        )));
    }
}
