package com.hotclick.agente.conversacion;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.spi.ControlCupoConversacion;
import com.hotclick.agente.conversacion.spi.InterceptorMensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntranteHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final ObjectProvider<InterceptorMensajeEntrante> interceptor;
    private final ObjectProvider<ControlCupoConversacion> cupo;

    public EnrutadorConversaciones(CanalCuentaService cuentas, ConversacionService conversaciones,
                                   RespondedorDespacho despacho) {
        this(cuentas, conversaciones, despacho, null, null);
    }

    public EnrutadorConversaciones(CanalCuentaService cuentas, ConversacionService conversaciones,
                                   RespondedorDespacho despacho,
                                   ObjectProvider<InterceptorMensajeEntrante> interceptor) {
        this(cuentas, conversaciones, despacho, interceptor, null);
    }

    @Autowired
    public EnrutadorConversaciones(CanalCuentaService cuentas, ConversacionService conversaciones,
                                   RespondedorDespacho despacho,
                                   ObjectProvider<InterceptorMensajeEntrante> interceptor,
                                   ObjectProvider<ControlCupoConversacion> cupo) {
        this.cuentas = cuentas;
        this.conversaciones = conversaciones;
        this.despacho = despacho;
        this.interceptor = interceptor;
        this.cupo = cupo;
    }

    @Override
    public void manejar(MensajeEntrante mensaje) {
        CanalCuenta cuenta = cuentas.buscar(mensaje.canal(), mensaje.cuentaId()).orElse(null);
        if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA) {
            log.info("[agente] mensaje descartado: cuenta no registrada o inactiva ({})", mensaje);
            return;
        }
        // Puede haber varios interceptores (baja/STOP y modo interno): el primero que consume el mensaje gana.
        boolean consumido = interceptor != null
            && interceptor.orderedStream().anyMatch(i -> i.interceptar(cuenta, mensaje));
        if (consumido) {
            // Código de vinculación, PIN o confirmación: no se guarda ni llega al motor (sin contenido en el log).
            log.info("[agente] mensaje consumido por el modo interno ({})", mensaje);
            return;
        }
        ConversacionActiva conv;
        try {
            conv = conversaciones.registrarEntrante(cuenta, mensaje);
        } catch (DataIntegrityViolationException e) {
            // Carrera: otro mensaje del mismo contacto creó la conversación primero; ahora ya existe.
            conv = conversaciones.registrarEntrante(cuenta, mensaje);
        }
        if (conv.modo() != ModoConversacion.BOT) return;
        ControlCupoConversacion control = cupo == null ? null : cupo.getIfAvailable();
        // Cupo agotado o tope de gasto: el control deja la conversación en PERSONA y el bot no responde (sin Claude).
        if (control != null && !control.permitir(conv)) {
            log.info("[agente] bot detenido por cupo o tope de gasto ({})", conv);
            return;
        }
        despacho.despachar(conv, mensaje);
    }
}
