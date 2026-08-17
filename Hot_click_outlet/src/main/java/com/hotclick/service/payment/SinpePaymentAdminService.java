package com.hotclick.service.payment;

import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.repository.PagoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class SinpePaymentAdminService {

    private static final Logger log = LoggerFactory.getLogger(SinpePaymentAdminService.class);

    @Autowired private PagoRepository                  pagoRepository;
    @Autowired private PaymentOrderConfirmationService orderConfirmationService;
    @Autowired private PaymentFailureHandler         paymentFailureHandler;
    @Autowired private PaymentStatusAssembler          paymentStatusAssembler;

    @Transactional
    public PaymentStatusResponse confirmarSinpe(Long pagoId, Object paymentServiceSelf,
                                                ApplicationEventPublisher eventPublisher) {
        Pago pago = pagoRepository.findById(pagoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago", pagoId));

        if (!Constants.PROVEEDOR_SINPE.equals(pago.getProveedor())) {
            throw new IllegalArgumentException("El pago no es de tipo SINPE");
        }
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            return paymentStatusAssembler.build(pago);
        }
        if (!Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue " + pago.getEstadoPago().toLowerCase() + " y no puede confirmarse");
        }

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        orderConfirmationService.confirmarPedido(pago, paymentServiceSelf, eventPublisher);
        log.info("Pago SINPE {} confirmado manualmente", pago.getPedido().getNumeroPedido());
        return paymentStatusAssembler.build(pago);
    }

    @Transactional
    public void rechazarSinpe(Long pagoId, String motivo) {
        Pago pago = pagoRepository.findById(pagoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago", pagoId));

        if (!Constants.PROVEEDOR_SINPE.equals(pago.getProveedor())) {
            throw new IllegalArgumentException("El pago no es de tipo SINPE");
        }
        if (!Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue procesado y no puede rechazarse");
        }

        paymentFailureHandler.marcarFallido(pago, motivo != null && !motivo.isBlank()
            ? motivo : "Comprobante rechazado por administrador");
        log.info("Pago SINPE {} rechazado", pago.getPedido().getNumeroPedido());
    }
}
