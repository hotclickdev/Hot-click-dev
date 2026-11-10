package com.hotclick.service.payment;

import com.hotclick.repository.PagoRepository;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * fix2 (intención antes de red): guarda la intención explícita de cancelar en su PROPIA transacción, confirmada antes
 * de cualquier llamada a ONVO (expire/GET). Si después la red falla, el proceso muere o la transacción de quien llama
 * se revierte, la intención igual queda: un cobro posterior va a REEMBOLSO_PENDIENTE y nunca confirma la venta.
 * <p>Regla de uso: SOLO se llama sin locks de pedido/pago tomados por la transacción de quien llama. Con un lock de
 * pedido tomado, este UPDATE del pago en otra conexión podría esperar a una captura que a su vez espera ese pedido
 * (bloqueo entre conexiones que PostgreSQL no detecta). En ese caso se usa el UPDATE dentro de la transacción.
 * Idempotente (la primera intención gana) y solo sobre un pago PENDIENTE.
 */
@Service
public class CancelacionIntencionService {

    private final PagoRepository pagoRepository;

    public CancelacionIntencionService(PagoRepository pagoRepository) {
        this.pagoRepository = pagoRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean registrar(Long pagoId, String origen) {
        if (pagoId == null) return false;
        pagoRepository.registrarCancelacionSolicitada(pagoId, LocalDateTime.now(Constants.ZONA_CR), origen);
        return pagoRepository.cancelacionSolicitadaEnBase(pagoId).isPresent();
    }
}
