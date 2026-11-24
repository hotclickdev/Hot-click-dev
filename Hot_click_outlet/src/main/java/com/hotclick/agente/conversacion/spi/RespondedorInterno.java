package com.hotclick.agente.conversacion.spi;

import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.webhook.MensajeEntrante;

/**
 * Respondedor del perfil NEGOCIO_INTERNO (teléfono vinculado de un usuario del negocio). Aparte de
 * {@link AgenteRespondedor} para que los dos coexistan: el despacho usa este para conversaciones internas.
 */
public interface RespondedorInterno {

    void responder(ConversacionActiva conversacion, MensajeEntrante mensaje);
}
