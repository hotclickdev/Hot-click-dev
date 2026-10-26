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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@PreAuthorize("hasRole('ADMIN') or hasAuthority('global.metrics')") // QA2-área2: solo plataforma
@RestController
@RequestMapping("/api/admin")
public class AdminPagoController {

    static final String SOLO_PLATAFORMA = "hasRole('ADMIN') or hasAuthority('global.metrics')";

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

        Long empresaId = empresaPagos();
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
     * Solo ADMIN o staff con global.metrics (FINANCE) — eventos son globales (sin empresaId en la tabla).
     */
    @PreAuthorize(SOLO_PLATAFORMA)
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
        Long empresaId  = empresaPagos();
        // tenant-global-ok: empresaId viene de empresaPagos(): null solo ADMIN o staff con global.metrics
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
        boolean verPlataforma = companyScope.isAdminIT() && !companyScope.isImpersonating();
        long webhooksErr = verPlataforma ? webhookEventRepository.countByProcesado(false) : 0;

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

    public static final String MSG_SINPE_SOLO_ONVO =
        "SINPE se confirma solo cuando ONVO acredita el pago (webhook + verificación). La confirmación y el rechazo manual están retirados.";

    /**
     * P-01 (decisión 25-oct-2026): retirado. Confirmaba un SINPE sin ONVO. Siempre 410, no toca el pago.
     */
    @PreAuthorize(SOLO_PLATAFORMA)
    @PostMapping("/pagos/{pagoId}/confirmar-sinpe")
    public ResponseEntity<ResponseDTO> confirmarSinpe(@PathVariable Long pagoId) {
        return ResponseEntity.status(HttpStatus.GONE).body(ResponseDTO.error(MSG_SINPE_SOLO_ONVO));
    }

    /** P-01: retirado junto con la confirmación manual; un intent vencido se libera por el barrido. Siempre 410. */
    @PreAuthorize(SOLO_PLATAFORMA)
    @PostMapping("/pagos/{pagoId}/rechazar-sinpe")
    public ResponseEntity<ResponseDTO> rechazarSinpe(@PathVariable Long pagoId) {
        return ResponseEntity.status(HttpStatus.GONE).body(ResponseDTO.error(MSG_SINPE_SOLO_ONVO));
    }

    private static ResponseEntity<ResponseDTO> prohibido(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error(e.getMessage()));
    }

    /** El motivo va en el cuerpo. El query queda solo para clientes viejos. */
    static String motivoEscrito(String query, Map<String, String> body) {
        String delCuerpo = body == null ? null : body.get("motivo");
        if (delCuerpo != null && !delCuerpo.isBlank()) return delCuerpo.trim();
        if (query != null && !query.isBlank()) return query.trim();
        return null;
    }

    /**
     * IDOR-07: vista global de pagos solo para ADMIN o staff de plataforma (la regla exige global.metrics).
     * Un EMPRENDEDOR sin empresa recibe 403 en vez de los pagos de todos los negocios.
     */
    private Long empresaPagos() {
        if (companyScope.isPlatformStaff() && !companyScope.isImpersonating()) return null;
        return companyScope.requireEmpresaIdOrAdmin();
    }
}
