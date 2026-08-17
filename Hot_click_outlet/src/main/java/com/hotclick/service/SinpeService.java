package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.service.sinpe.SinpeAutoApprovalService;
import com.hotclick.service.sinpe.SinpeCheckoutService;
import com.hotclick.service.sinpe.SinpeComprobanteService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Lógica de negocio para pagos SINPE Móvil.
 * Flujo: checkout → subir comprobante → aprobación admin (o auto-aprobación a los 3 días).
 */
@Service
public class SinpeService {

    @Autowired private SinpeCheckoutService     checkoutService;
    @Autowired private SinpeComprobanteService  comprobanteService;
    @Autowired private SinpeAutoApprovalService autoApprovalService;

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        return checkoutService.checkout(req, correoUsuario);
    }

    @Transactional
    public void subirComprobante(String numeroPedido, MultipartFile archivo,
                                 String nombreRemitente, String cedulaRemitente,
                                 String telefonoRemitente, String correoUsuario) {
        comprobanteService.subirComprobante(numeroPedido, archivo, nombreRemitente,
            cedulaRemitente, telefonoRemitente, correoUsuario);
    }

    @Transactional
    public void aprobar(Long comprobanteId, String adminEmail, Long adminId) {
        comprobanteService.aprobar(comprobanteId, adminEmail, adminId);
    }

    @Transactional
    public void rechazar(Long comprobanteId, String motivo, String adminEmail, Long adminId) {
        comprobanteService.rechazar(comprobanteId, motivo, adminEmail, adminId);
    }

    @Scheduled(cron = "0 0 1 * * *") // 1:00 AM diario
    @SchedulerLock(name = "sinpe_auto_approval", lockAtMostFor = "PT30M", lockAtLeastFor = "PT10M")
    @Transactional
    public void autoAprobarExpirados() {
        autoApprovalService.autoAprobarExpirados();
    }

    @Transactional(readOnly = true)
    public Page<ComprobanteSinpe> listar(String estado, Pageable pageable) {
        return comprobanteService.listar(estado, pageable);
    }
}
