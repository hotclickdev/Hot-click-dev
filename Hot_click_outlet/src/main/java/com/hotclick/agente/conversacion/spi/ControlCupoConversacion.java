package com.hotclick.agente.conversacion.spi;

import com.hotclick.agente.conversacion.ConversacionActiva;

/**
 * Puerta previa al bot: el enrutador la consulta cuando la conversación está en modo BOT, ya guardado el mensaje.
 * Si devuelve false el bot NO responde (no se llama a Claude); la implementación es quien deja la conversación en
 * modo PERSONA con la marca de cupo agotado. Sin implementación registrada, el bot responde siempre.
 */
public interface ControlCupoConversacion {

    /** @return true si el bot puede responder este mensaje. */
    boolean permitir(ConversacionActiva conversacion);
}
