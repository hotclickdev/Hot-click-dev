package com.hotclick.service.payment;

import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * QA5 MEDIO (pago rechazado): cuando la reconsulta a ONVO dice «sin cobro», mira si el cobro fue RECHAZADO
 * (intent en requires_payment_method con lastPaymentError, ver {@link OnvoCobroVerificador#intentRechazado}).
 * Si lo fue, expira la sesión en ONVO (ya no se puede pagar ese pedido) y, solo si ONVO confirma que quedó
 * expirada y sin cobro, pasa el pago a FALLIDO y libera el stock ({@link PagoExpiradoCancelador#marcarFallido}).
 * No depende del webhook. Sin transacción abierta mientras consulta a ONVO. Fail-closed: ante cualquier duda
 * (sin llave, sesión pagada, intent en otro estado, ONVO no expira) no toca nada.
 */
@Service
public class OnvoRechazoService {

    private static final Logger log = LoggerFactory.getLogger(OnvoRechazoService.class);

    private final OnvoService onvoService;
    private final OnvoPaymentProvider onvoPaymentProvider;
    private final PagoExpiradoCancelador pagoExpiradoCancelador;

    public OnvoRechazoService(OnvoService onvoService, @Lazy OnvoPaymentProvider onvoPaymentProvider,
                              PagoExpiradoCancelador pagoExpiradoCancelador) {
        this.onvoService = onvoService;
        this.onvoPaymentProvider = onvoPaymentProvider;
        this.pagoExpiradoCancelador = pagoExpiradoCancelador;
    }

    /** true si este llamado dejó el pago FALLIDO (y liberó el stock); false en cualquier otro caso. */
    public boolean cerrarSiRechazado(Long pagoId, String sessionId) {
        if (pagoId == null || sessionId == null || sessionId.isBlank() || !onvoService.isPagosDisponibles()) {
            return false;
        }
        Map<?, ?> sesion = onvoService.obtenerCheckoutSession(sessionId);
        if (sesion == null || sesion.isEmpty() || "paid".equalsIgnoreCase(String.valueOf(sesion.get("paymentStatus")))) {
            return false;
        }
        String intentId = OnvoCobroVerificador.paymentIntentId(sesion);
        if (intentId == null || intentId.isBlank()) {
            return false;
        }
        Map<?, ?> intent = onvoService.obtenerPaymentIntent(intentId);
        if (!OnvoCobroVerificador.intentRechazado(intent, onvoService.modoEsperado())) {
            return false;
        }
        if (!onvoPaymentProvider.expirarSesionSinCobro(sessionId)) {
            return false;
        }
        boolean cerrado = pagoExpiradoCancelador.marcarFallido(pagoId);
        if (cerrado) {
            log.warn("[onvo] Cobro rechazado por ONVO: pago id={} FALLIDO y stock liberado", pagoId);
        }
        return cerrado;
    }
}
