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

    /**
     * Crea la sesión y arma el payload del cajero en la misma transacción.
     * Con open-in-view=false, leer empresa LAZY después del commit tira
     * LazyInitializationException y el front nunca recibe el token del QR.
     */
    @Transactional
    public Map<String, Object> crearSesion(Long usuarioId, Long empresaId, Long turnoId,
                                   String metodoPago, List<Map<String, Object>> items,
                                   String notas, Long clienteId, Long bodegaId) {
        PosQrSesion sesion = sessionService.crearSesion(
            usuarioId, empresaId, turnoId, metodoPago, items, notas, clienteId, bodegaId);
        return sessionService.respuestaCajero(sesion);
    }

    public Map<String, Object> respuestaCajero(PosQrSesion sesion) {
        return sessionService.respuestaCajero(sesion);
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
    public Map<String, String> crearPaymentIntent(String token) {
        return ventaService.crearPaymentIntent(token);
    }

    @Transactional
    public Map<String, String> iniciarSinpeOnvo(String token, String telefono, String cedula,
                                               String nombre, String email) {
        return ventaService.iniciarSinpeOnvo(token, telefono, cedula, nombre, email);
    }

    @Transactional
    public String verificarEstado(String token) {
        return ventaService.verificarEstado(token);
    }

    @Transactional
    public Map<String, Object> consultarEstado(String token) {
        return ventaService.consultarEstado(token);
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
