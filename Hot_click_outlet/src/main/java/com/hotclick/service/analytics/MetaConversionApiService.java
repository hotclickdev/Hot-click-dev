package com.hotclick.service.analytics;

import com.hotclick.model.Pedido;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Meta Conversion API — APAGADA por decisión del dueño (sin publicidad, 10-oct-2026).
 * Nunca envía eventos ni hace llamadas HTTP, aunque haya META_* configurado. Se mantienen
 * {@link #isEnabled()} y {@link #enviarPurchase(Pedido)} para que los llamadores compilen.
 */
@Service
public class MetaConversionApiService {

    private static final Logger log = LoggerFactory.getLogger(MetaConversionApiService.class);
    private static final AtomicBoolean AVISADO = new AtomicBoolean(false);

    /** Se inyecta solo para dejar explícito (y testeable) que nunca se usa. */
    @SuppressWarnings({"unused", "java:S1068"})
    private final RestTemplate restTemplate;

    public MetaConversionApiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean isEnabled() {
        return false;
    }

    /** No hace nada: sin publicidad no se envían compras a Meta. */
    public void enviarPurchase(Pedido pedido) {
        if (AVISADO.compareAndSet(false, true)) {
            log.debug("[meta-capi] desactivada (sin publicidad): no se envían eventos a Meta");
        }
    }
}
