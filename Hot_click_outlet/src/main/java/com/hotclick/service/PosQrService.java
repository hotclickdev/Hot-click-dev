package com.hotclick.service;

import com.hotclick.model.PosQrSesion;
import com.hotclick.service.pos.PosQrSessionService;
import com.hotclick.service.pos.PosQrVentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Lógica de negocio para sesiones de pago QR del POS.
 * El cajero crea la sesión, el cliente escanea y paga (SINPE o Stripe).
 */
@Service
public class PosQrService {

    @Autowired private PosQrSessionService sessionService;
    @Autowired private PosQrVentaService   ventaService;

    @Transactional
    public PosQrSesion crearSesion(Long usuarioId, Long empresaId, Long turnoId,
                                   String metodoPago, List<Map<String, Object>> items,
                                   String notas) {
        return sessionService.crearSesion(usuarioId, empresaId, turnoId, metodoPago, items, notas);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getInfoPublica(String token) {
        return sessionService.getInfoPublica(token);
    }

    @Transactional
    public String crearStripeCheckout(String token) {
        return ventaService.crearStripeCheckout(token);
    }

    @Transactional
    public String verificarEstado(String token) {
        return ventaService.verificarEstado(token);
    }

    @Transactional
    public PosQrSesion confirmarSinpe(String token, Long usuarioId, Long empresaId, String notas) {
        return ventaService.confirmarSinpe(token, usuarioId, empresaId, notas);
    }

    @Transactional
    public void cancelar(String token, Long empresaId) {
        sessionService.cancelar(token, empresaId);
    }
}
