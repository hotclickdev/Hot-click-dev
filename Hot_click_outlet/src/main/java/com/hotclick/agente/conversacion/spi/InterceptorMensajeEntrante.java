package com.hotclick.agente.conversacion.spi;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.webhook.MensajeEntrante;

/**
 * Gancho previo al almacenamiento: el enrutador lo consulta antes de guardar el mensaje. Si devuelve true, el
 * mensaje lo consumió el interceptor (p. ej. un código de vinculación o un PIN) y NO se guarda en el historial ni
 * llega al motor ni a Claude. Debe decidir rápido (el webhook debe responder pronto); el trabajo pesado va aparte.
 */
public interface InterceptorMensajeEntrante {

    /** @return true si el mensaje fue consumido y no debe seguir su camino normal. */
    boolean interceptar(CanalCuenta cuenta, MensajeEntrante mensaje);
}
