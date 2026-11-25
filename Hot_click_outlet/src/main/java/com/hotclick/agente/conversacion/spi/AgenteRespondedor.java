package com.hotclick.agente.conversacion.spi;

import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.webhook.MensajeEntrante;

/**
 * Punto de extensión del motor de bots. El enrutador lo invoca de forma asíncrona (hilo propio) cuando la
 * conversación está en modo BOT; si no hay implementación registrada, no pasa nada. Una excepción se registra
 * (sin contenido) y no afecta al webhook. La implementación responde con {@code CanalMensajeria.enviarTexto}.
 */
public interface AgenteRespondedor {

    void responder(ConversacionActiva conversacion, MensajeEntrante mensaje);
}
