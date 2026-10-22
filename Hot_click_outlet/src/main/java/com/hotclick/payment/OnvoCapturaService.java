package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.WebhookEvent;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Escribe en la base lo que ONVO ya confirmó por GET. Solo lo llama {@link OnvoPaymentProvider}
 * después de verificar la sesión y el payment intent; acá no se consulta a ONVO.
 * Transacción propia: un fallo de la captura no deja en rollback-only a quien la llama
 * (p. ej. la limpieza por expiración, que procesa varios pagos en una sola transacción).
 */
@Service
public class OnvoCapturaService {

    private static final Logger log = LoggerFactory.getLogger(OnvoCapturaService.class);

    @Autowired private PagoRepository         pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    @Lazy
    @Autowired private PaymentService paymentService;

    /** false si otra entrega ya la había capturado (dedupe por sessionId). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean capturarVerificado(String checkoutSessionId, String resumen, String origen) {
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(
                checkoutSessionId, OnvoPaymentProvider.EVENTO_SESION)) {
            return false;
        }
        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())
                || Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            return false;
        }

        WebhookEvent evento = registrar(checkoutSessionId, OnvoPaymentProvider.EVENTO_SESION, resumen, origen);

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo(Constants.PROVEEDOR_ONVO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        paymentService.confirmarPedido(pago);

        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
        webhookEventRepository.save(evento);

        log.info("[onvo] Checkout confirmado: sessionId={}", checkoutSessionId);
        return true;
    }

    WebhookEvent registrar(String token, String tipo, String resumen, String origen) {
        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(token);
        evento.setEventoTipo(tipo);
        evento.setPayloadRaw(resumen);
        evento.setIpOrigen(origen);
        evento.setFechaRecepcion(LocalDateTime.now(Constants.ZONA_CR));
        evento.setEstado(Constants.ESTADO_ACTIVO);
        webhookEventRepository.save(evento);
        return evento;
    }
}
