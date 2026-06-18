package com.hotclick.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * AFTER_COMMIT garantiza que el código de desbloqueo se envíe solo si el
 * incremento de intentos_fallidos quedó persistido (nunca un valor que
 * termine en rollback), y que el lock de fila de la UPDATE atómica no se
 * mantenga durante la llamada (potencialmente lenta) al proveedor de email.
 */
@Component
public class CuentaBloqueadaListener {

    @Autowired
    private PasswordResetService passwordResetService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCuentaBloqueada(CuentaBloqueadaEvent event) {
        try {
            passwordResetService.enviarCodigo(event.getCorreo());
        } catch (Exception ignored) {
            // no interrumpe el flujo si falla el email
        }
    }
}
