package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.service.sinpe.SinpeCheckoutService;
import com.hotclick.service.sinpe.SinpeComprobanteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lógica de negocio para pagos SINPE Móvil.
 * P-01: checkout por intent ONVO (confirmado solo por webhook). Comprobantes viejos: solo lectura (historial).
 */
@Service
public class SinpeService {

    @Autowired private SinpeCheckoutService     checkoutService;
    @Autowired private SinpeComprobanteService  comprobanteService;

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        return checkoutService.checkout(req, correoUsuario);
    }

    @Transactional(readOnly = true)
    public String urlFirmadaComprobante(Long comprobanteId, String correo, boolean adminPlataforma) {
        return comprobanteService.urlFirmadaComprobante(comprobanteId, correo, adminPlataforma);
    }

    public Page<ComprobanteSinpe> listar(String estado, Pageable pageable) {
        return comprobanteService.listar(estado, pageable);
    }
}
