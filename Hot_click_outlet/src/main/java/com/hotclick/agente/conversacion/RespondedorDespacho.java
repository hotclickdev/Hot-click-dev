package com.hotclick.agente.conversacion;

import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.conversacion.spi.RespondedorInterno;
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

    public RespondedorDespacho(ObjectProvider<AgenteRespondedor> respondedor) {
        this(respondedor, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public RespondedorDespacho(ObjectProvider<AgenteRespondedor> respondedor,
                               ObjectProvider<RespondedorInterno> interno) {
        this.respondedor = respondedor;
        this.interno = interno;
    }

    @Async("taskExecutor")
    public void despachar(ConversacionActiva conversacion, MensajeEntrante mensaje) {
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
