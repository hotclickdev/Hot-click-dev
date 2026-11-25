package com.hotclick.agente.metricas;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.conversacion.spi.InterceptorMensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * AG-38: la respuesta de la encuesta llega como {@code botonId} ({@code encuesta:<sesion>:<nota>}). Corre ANTES de
 * guardar el mensaje: el interceptor guarda solo la nota y consume el mensaje, así que el título de la fila que eligió
 * la persona no entra al historial, no abre una conversación nueva y no llega al bot ni a Claude.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class InterceptorEncuesta implements InterceptorMensajeEntrante {

    private static final Logger log = LoggerFactory.getLogger(InterceptorEncuesta.class);

    private final EncuestaService encuesta;

    public InterceptorEncuesta(EncuestaService encuesta) {
        this.encuesta = encuesta;
    }

    @Override
    public boolean interceptar(CanalCuenta cuenta, MensajeEntrante m) {
        if (m.botonId() == null || !m.botonId().startsWith(EncuestaService.PREFIJO)) return false;
        try {
            boolean consumido = encuesta.registrarRespuesta(cuenta, m.remitenteId(), m.botonId());
            if (consumido) log.info("[agente-encuesta] respuesta de encuesta recibida ({})", m);
            return consumido;
        } catch (RuntimeException e) {
            // Sin mensaje ni id: puede traer datos. Si falló, igual se consume: no debe llegar al bot como texto.
            log.warn("[agente-encuesta] no se pudo guardar la respuesta: {}", e.getClass().getSimpleName());
            return true;
        }
    }
}
