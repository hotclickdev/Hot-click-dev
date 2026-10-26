package com.hotclick.service.suscripcion;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Supplier;

/**
 * Límites de transacción del webhook de billing ONVO.
 * {@link #enTx}: registro del evento (INSERT+flush) y despacho en UNA transacción; cualquier excepción la revierte entera.
 * {@link #aparte}: transacción nueva que solo marca el evento (rechazo o fallo), después del rollback del despacho.
 */
@Component
public class OnvoBillingDespachoTx {

    @Transactional
    public <T> T enTx(Supplier<T> trabajo) {
        return trabajo.get();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <T> T aparte(Supplier<T> trabajo) {
        return trabajo.get();
    }
}
