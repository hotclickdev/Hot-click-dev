package com.hotclick.agente.conversacion;

import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.conversacion.spi.RespondedorInterno;
import com.hotclick.agente.voz.VozEntranteService;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/** Invoca al {@link AgenteRespondedor} fuera del hilo del webhook. Sin implementación, no hace nada. */
@Component
public class RespondedorDespacho {

    private static final Logger log = LoggerFactory.getLogger(RespondedorDespacho.class);

    private final ObjectProvider<AgenteRespondedor> respondedor;
    private final ObjectProvider<RespondedorInterno> interno;

    private final ObjectProvider<VozEntranteService> voz;

    public RespondedorDespacho(ObjectProvider<AgenteRespondedor> respondedor) {
        this(respondedor, null, null);
    }

    public RespondedorDespacho(ObjectProvider<AgenteRespondedor> respondedor,
                               ObjectProvider<RespondedorInterno> interno) {
        this(respondedor, interno, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public RespondedorDespacho(ObjectProvider<AgenteRespondedor> respondedor,
                               ObjectProvider<RespondedorInterno> interno,
                               ObjectProvider<VozEntranteService> voz) {
        this.respondedor = respondedor;
        this.interno = interno;
        this.voz = voz;
    }

    @Async("taskExecutor")
    public void despachar(ConversacionActiva conversacion, MensajeEntrante original) {
        MensajeEntrante mensaje = original;
        // AG-13: nota de voz → texto (o respuesta de respaldo). Solo si hay quién responda.
        if ("audio".equals(original.tipo()) && voz != null && (respondedor.getIfAvailable() != null
                || (interno != null && interno.getIfAvailable() != null))) {
            VozEntranteService v = voz.getIfAvailable();
            if (v != null) {
                try {
                    mensaje = v.procesar(conversacion, original);
                } catch (RuntimeException e) {
                    log.warn("[agente] falló el manejo de voz ({}) en {}", e.getClass().getSimpleName(), conversacion);
                    return;
                }
                if (mensaje == null) return;
            }
        }
        RespondedorInterno ri = conversacion.perfil() == PerfilConversacion.NEGOCIO_INTERNO && interno != null
            ? interno.getIfAvailable() : null;
        AgenteRespondedor r = ri == null ? respondedor.getIfAvailable() : null;
        if (ri == null && r == null) return;
        try {
            if (ri != null) ri.responder(conversacion, mensaje);
            else r.responder(conversacion, mensaje);
        } catch (Exception e) {
            // Sin mensaje de la excepción: podría arrastrar texto o ids del cliente.
            log.warn("[agente] el respondedor falló ({}) en {}", e.getClass().getSimpleName(), conversacion);
        }
    }
}
