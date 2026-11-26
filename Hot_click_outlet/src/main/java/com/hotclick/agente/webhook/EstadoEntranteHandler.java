package com.hotclick.agente.webhook;

/**
 * Recibe los acuses de entrega y lectura y los cambios de estado de plantillas. El webhook responde 200 aunque un
 * handler falle. Las implementaciones deben ser idempotentes: Meta repite los acuses.
 */
public interface EstadoEntranteHandler {

    void estado(EstadoEntrante.EstadoMensaje estado);

    void plantilla(EstadoEntrante.EstadoPlantilla plantilla);
}
