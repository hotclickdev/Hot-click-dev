package com.hotclick.agente.cupo;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Envía la confirmación de STOP/ACTIVAR fuera del hilo del webhook (el interceptor debe decidir rápido). Es el único
 * mensaje que sale tras una baja. Nunca registra destinatario ni texto.
 */
@Component
public class ConfirmacionBajaEnvio {

    private static final Logger log = LoggerFactory.getLogger(ConfirmacionBajaEnvio.class);

    private final CanalMensajeria canal;

    public ConfirmacionBajaEnvio(CanalMensajeria canal) {
        this.canal = canal;
    }

    @Async("taskExecutor")
    public void enviar(CanalCuenta cuenta, String destinatario, String texto) {
        try {
            canal.enviarTexto(cuenta, destinatario, texto);
        } catch (RuntimeException e) {
            log.warn("[agente-baja] no se pudo enviar la confirmación: {}", e.getClass().getSimpleName());
        }
    }
}
