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
import com.hotclick.security.RateLimiter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
        // AG-14: ráfaga de un mismo contacto. El cupo no cubre a HotClick ni al modo interno, y aun con cupo una sola
        // persona podía agotar el tope de gasto del negocio. El mensaje ya quedó guardado (la persona lo ve en la
        // bandeja); solo se omite la llamada a Claude. Llave por id de conversación: sin teléfono en la tabla.
        if (!dentroDelLimite(conv)) {
            log.warn("[agente] ráfaga de mensajes: el bot no responde este turno ({})", conv);
            return;
        }
        despacho.despachar(conv, mensaje);
    }

    private RateLimiter limitador;
    private int maxPorMinuto = 10;
    private int maxPorHora = 60;

    /** Límite por conversación (opcional: sin limitador, como en las pruebas que no lo configuran, no aplica). */
    @Autowired(required = false)
    public void setLimitador(RateLimiter limitador,
                             @Value("${agente.limite.mensajes-por-minuto:10}") int maxPorMinuto,
                             @Value("${agente.limite.mensajes-por-hora:60}") int maxPorHora) {
        this.limitador = limitador;
        this.maxPorMinuto = Math.max(1, maxPorMinuto);
        this.maxPorHora = Math.max(1, maxPorHora);
    }

    private int maxHotClickPorMinuto = 60;

    /**
     * Tope global de mensajes procesados por minuto para la cuenta de HotClick (sin empresa): muchos contactos
     * distintos no pasan el límite por conversación, y esa cuenta no tiene cupo ni tope de gasto (AG-14).
     */
    @Autowired(required = false)
    public void setTopeHotClick(@Value("${agente.limite.hotclick-mensajes-por-minuto:60}") int maxPorMinuto) {
        this.maxHotClickPorMinuto = Math.max(1, maxPorMinuto);
    }

    private boolean dentroDelLimite(ConversacionActiva conv) {
        if (limitador == null) return true;
        // Fail-closed como los demás topes de costo: si la BD del limitador falla, no se llama a Claude.
        if (conv.sesionId() != null) {
            String base = "agente:conv:" + conv.sesionId();
            if (!limitador.tryAcquireEstricto(base + ":m", maxPorMinuto, 60)
                || !limitador.tryAcquireEstricto(base + ":h", maxPorHora, 3600)) return false;
        }
        // Se cuenta después del límite por conversación: un contacto ya bloqueado no gasta el tope global.
        return conv.empresaId() != null
            || limitador.tryAcquireEstricto("agente:hotclick:m", maxHotClickPorMinuto, 60);
    }
}
