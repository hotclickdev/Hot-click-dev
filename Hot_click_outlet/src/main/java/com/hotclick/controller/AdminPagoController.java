package com.hotclick.controller;

import com.hotclick.dto.PagoResumenDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.WebhookEventResumenDTO;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
@RestController
@RequestMapping("/api/admin")
public class AdminPagoController {

    @Autowired private PagoRepository         pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private PaymentService         paymentService;
    @Autowired private CompanyScope           companyScope;

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

        Long empresaId = companyScope.getCurrentEmpresaId();
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<?> resultado = pagoRepository
            .buscarPagosByEmpresa(proveedor, estadoPago, empresaId, pageable)
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
        Long empresaId  = companyScope.getCurrentEmpresaId();
        long total      = empresaId == null ? pagoRepository.count()
                            : pagoRepository.countByEstadoPagoAndEmpresa("CAPTURADO", empresaId)
                            + pagoRepository.countByEstadoPagoAndEmpresa("PENDIENTE", empresaId)
                            + pagoRepository.countByEstadoPagoAndEmpresa("FALLIDO",   empresaId)
                            + pagoRepository.countByEstadoPagoAndEmpresa("CANCELADO", empresaId);
        long capturados = pagoRepository.countByEstadoPagoAndEmpresa("CAPTURADO", empresaId);
        long pendientes = pagoRepository.countByEstadoPagoAndEmpresa("PENDIENTE", empresaId);
        long fallidos   = pagoRepository.countByEstadoPagoAndEmpresa("FALLIDO",   empresaId);
        long stripe     = pagoRepository.countByProveedorAndEmpresa("STRIPE",  empresaId);
        long sinpe      = pagoRepository.countByProveedorAndEmpresa("SINPE",   empresaId);
        long webhooksErr= webhookEventRepository.countByProcesado(false);

        double tasaExito = total > 0 ? Math.round((double) capturados / total * 1000.0) / 10.0 : 0.0;

        return ResponseEntity.ok(ResponseDTO.success("KPIs", Map.of(
            "total",       total,
            "capturados",  capturados,
            "pendientes",  pendientes,
            "fallidos",    fallidos,
            "stripe",      stripe,
            "sinpe",       sinpe,
            "tasaExito",   tasaExito,
            "webhooksErr", webhooksErr
        )));
    }

    /**
     * Confirma un pago SINPE pendiente (admin revisó el comprobante).
     * POST /api/admin/pagos/{pagoId}/confirmar-sinpe
     */
    @PostMapping("/pagos/{pagoId}/confirmar-sinpe")
    public ResponseEntity<ResponseDTO> confirmarSinpe(@PathVariable Long pagoId) {
        var resultado = paymentService.confirmarSinpe(pagoId);
        return ResponseEntity.ok(ResponseDTO.success("Pago SINPE confirmado", resultado));
    }

    /**
     * Rechaza un pago SINPE pendiente (comprobante inválido o monto incorrecto).
     * POST /api/admin/pagos/{pagoId}/rechazar-sinpe?motivo=...
     */
    @PostMapping("/pagos/{pagoId}/rechazar-sinpe")
    public ResponseEntity<ResponseDTO> rechazarSinpe(
            @PathVariable Long pagoId,
            @RequestParam(required = false) String motivo) {
        paymentService.rechazarSinpe(pagoId, motivo);
        return ResponseEntity.ok(ResponseDTO.success("Pago SINPE rechazado", null));
    }
}
