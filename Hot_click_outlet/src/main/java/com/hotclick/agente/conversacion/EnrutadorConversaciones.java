package com.hotclick.agente.conversacion;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntranteHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * Recibe cada mensaje entrante (ya verificado y deduplicado), lo guarda en la conversación correcta y, si el modo
 * es BOT, invoca al respondedor de forma asíncrona. Cuenta desconocida o no ACTIVA → se descarta. Nunca registra
 * remitente, texto ni ids de cuenta.
 */
@Component
public class EnrutadorConversaciones implements MensajeEntranteHandler {

    private static final Logger log = LoggerFactory.getLogger(EnrutadorConversaciones.class);

    private final CanalCuentaService cuentas;
    private final ConversacionService conversaciones;
    private final RespondedorDespacho despacho;

    public EnrutadorConversaciones(CanalCuentaService cuentas, ConversacionService conversaciones,
                                   RespondedorDespacho despacho) {
        this.cuentas = cuentas;
        this.conversaciones = conversaciones;
        this.despacho = despacho;
    }

    @Override
    public void manejar(MensajeEntrante mensaje) {
        CanalCuenta cuenta = cuentas.buscar(mensaje.canal(), mensaje.cuentaId()).orElse(null);
        if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA) {
            log.info("[agente] mensaje descartado: cuenta no registrada o inactiva ({})", mensaje);
            return;
        }
        ConversacionActiva conv;
        try {
            conv = conversaciones.registrarEntrante(cuenta, mensaje);
        } catch (DataIntegrityViolationException e) {
            // Carrera: otro mensaje del mismo contacto creó la conversación primero; ahora ya existe.
            conv = conversaciones.registrarEntrante(cuenta, mensaje);
        }
        if (conv.modo() == ModoConversacion.BOT) despacho.despachar(conv, mensaje);
    }
}
