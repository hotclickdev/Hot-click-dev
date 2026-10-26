package com.hotclick.service.suscripcion;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ejecuta el despacho de un evento de billing ONVO en su propia transacción: si el evento se rechaza,
 * solo se revierte el despacho y el registro de auditoría del evento sigue en la transacción externa
 * (sin esto, el rollback-only de la transacción interna convertía el rechazo en 500).
 */
@Component
public class OnvoBillingDespachoTx {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ejecutar(Runnable despacho) {
        despacho.run();
    }
}
