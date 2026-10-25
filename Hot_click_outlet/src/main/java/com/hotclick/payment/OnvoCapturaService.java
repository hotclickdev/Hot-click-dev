package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.WebhookEvent;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
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
    @Autowired private PedidoGrupoService     pedidoGrupoService;

    /** Resultado de escribir un cobro que ONVO ya confirmó. */
    public enum Captura { CAPTURADO, DUPLICADO, COBRADO_SOBRE_CANCELADO }

    @Lazy
    @Autowired private PaymentService paymentService;

    /**
     * DUPLICADO si otra entrega ya la había procesado (dedupe por sessionId).
     * COBRADO_SOBRE_CANCELADO si el pedido ya estaba cancelado (expiró o lo canceló el comprador):
     * no se resucita, porque su stock ya se liberó y podría venderse dos veces.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Captura capturarVerificado(String checkoutSessionId, String resumen, String origen) {
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(
                checkoutSessionId, OnvoPaymentProvider.EVENTO_SESION)) {
            return Captura.DUPLICADO;
        }
        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null || !Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())
                || Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            return Captura.DUPLICADO;
        }

        WebhookEvent evento = registrar(checkoutSessionId, OnvoPaymentProvider.EVENTO_SESION, resumen, origen);

        if (algunoCancelado(pago)) {
            pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
            pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
            pagoRepository.save(pago);
            evento.setProcesado(true);
            evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
            evento.setErrorProcesamiento("Cobro de ONVO sobre pedido cancelado: reembolso pendiente");
            webhookEventRepository.save(evento);
            log.error("[ALERTA-PAGO] ONVO cobró un pedido ya cancelado; queda para reembolso del admin: sessionId={}",
                checkoutSessionId);
            return Captura.COBRADO_SOBRE_CANCELADO;
        }

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo(Constants.PROVEEDOR_ONVO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        paymentService.confirmarPedido(pago);

        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
        webhookEventRepository.save(evento);

        log.info("[onvo] Checkout confirmado: sessionId={}", checkoutSessionId);
        return Captura.CAPTURADO;
    }

    private boolean algunoCancelado(Pago pago) {
        if (pago.getPedido() == null) return false;
        return pedidoGrupoService.delGrupo(pago.getPedido()).stream()
            .anyMatch(pedido -> Constants.PEDIDO_CANCELADO.equals(pedido.getEstadoPedido()));
    }

    /** Guarda el SINPERefNumber una sola vez en el pago ya capturado. No toca estado ni montos. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void guardarSinpeRef(String checkoutSessionId, String sinpeRef) {
        if (sinpeRef == null || sinpeRef.isBlank()) return;
        pagoRepository.findByMerchantToken(checkoutSessionId)
            .filter(p -> p.getSinpeRefNumber() == null)
            .ifPresent(p -> {
                p.setSinpeRefNumber(sinpeRef);
                pagoRepository.save(p);
            });
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
