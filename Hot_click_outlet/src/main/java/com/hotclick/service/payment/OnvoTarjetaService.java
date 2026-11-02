package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.TransaccionPago;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.TransaccionPagoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.IdEnmascarado;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * QA5 BAJO: guarda marca y últimos 4 de la tarjeta de un cobro ONVO capturado, para que
 * {@code cardLast4}/{@code cardBrand} del estado del pago no salgan vacíos. Campos según la doc de ONVO
 * (Payment intents): {@code paymentMethod.card.brand} y {@code paymentMethod.card.last4}. Nada más se guarda
 * (ni nombre, ni vencimiento, ni el payload): solo 4 dígitos y la marca. Best-effort y después del commit:
 * un fallo acá nunca cambia la captura.
 */
@Service
public class OnvoTarjetaService {

    private static final Logger log = LoggerFactory.getLogger(OnvoTarjetaService.class);
    static final String TIPO_OPERACION = "ONVO_CAPTURA";
    static final String CODIGO_OK = "OK";
    private static final Pattern LAST4 = Pattern.compile("^\\d{4}$");
    private static final Pattern MARCA = Pattern.compile("^[A-Za-z][A-Za-z ._-]{0,19}$");

    @Autowired(required = false) private OnvoService onvoService;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private TransaccionPagoRepository transaccionPagoRepository;
    @Autowired private PlatformTransactionManager txManager;

    /** Marca y últimos 4 validados; null en un campo si ONVO no lo manda o no tiene el formato esperado. */
    public record Tarjeta(String brand, String last4) {
        boolean vacia() { return brand == null && last4 == null; }
    }

    public static Tarjeta extraer(Map<?, ?> intent) {
        if (intent == null || !(intent.get("paymentMethod") instanceof Map<?, ?> pm)
                || !(pm.get("card") instanceof Map<?, ?> card)) {
            return new Tarjeta(null, null);
        }
        String last4 = texto(card.get("last4"));
        String brand = texto(card.get("brand"));
        return new Tarjeta(brand != null && MARCA.matcher(brand).matches() ? brand : null,
            last4 != null && LAST4.matcher(last4).matches() ? last4 : null);
    }

    private static String texto(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : s;
    }

    /** Llamado dentro de la transacción de captura: programa la lectura para después del commit. */
    public void despuesDeCaptura(String checkoutSessionId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            guardar(checkoutSessionId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { guardar(checkoutSessionId); }
        });
    }

    void guardar(String checkoutSessionId) {
        try {
            if (onvoService == null || checkoutSessionId == null) return;
            Map<?, ?> sesion = onvoService.obtenerCheckoutSession(checkoutSessionId);
            String intentId = OnvoCobroVerificador.paymentIntentId(sesion);
            if (intentId == null || intentId.isBlank()) return;
            Tarjeta t = extraer(onvoService.obtenerPaymentIntent(intentId));
            if (t.vacia()) return;
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.executeWithoutResult(s -> registrar(checkoutSessionId, t));
        } catch (RuntimeException e) {
            log.warn("[onvo] No se guardaron los datos de tarjeta: sessionId={} ({})",
                IdEnmascarado.de(checkoutSessionId), e.getClass().getSimpleName());
        }
    }

    private void registrar(String checkoutSessionId, Tarjeta t) {
        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null || !Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) return;
        TransaccionPago tp = new TransaccionPago();
        tp.setPago(pago);
        tp.setTipoOperacion(TIPO_OPERACION);
        tp.setErrorCode(CODIGO_OK);
        tp.setMontoOperacion(pago.getMonto() == null ? 0 : pago.getMonto().intValue());
        tp.setCardLast4(t.last4());
        tp.setCardBrand(t.brand() == null ? null : t.brand().toUpperCase(Locale.ROOT));
        tp.setFechaTransaccion(LocalDateTime.now(Constants.ZONA_CR));
        transaccionPagoRepository.save(tp);
    }
}
