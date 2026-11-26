package com.hotclick.agente.webhook;

/**
 * Recibe cada mensaje entrante ya verificado y deduplicado.
 *
 * <p>El webhook responde 200 a Meta apenas termina de despachar, así que una implementación que haga
 * trabajo lento (llamar a Claude, enviar respuestas) debe hacerlo de forma asíncrona. Una excepción aquí
 * se registra y no afecta la respuesta a Meta ni a los demás handlers.
 */
public interface MensajeEntranteHandler {

    void manejar(MensajeEntrante mensaje);
}
