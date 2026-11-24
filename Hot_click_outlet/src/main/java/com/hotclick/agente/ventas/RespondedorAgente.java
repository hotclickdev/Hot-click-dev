package com.hotclick.agente.ventas;

import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.motor.Alcance;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.motor.TurnoConversacion;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Responde las conversaciones en modo BOT: llama al motor, guarda el turno del asistente y envía el texto por el
 * canal de la cuenta. Sin textos ni teléfonos en logs (Ley 8968).
 */
@Component
public class RespondedorAgente implements AgenteRespondedor {

    private static final Logger log = LoggerFactory.getLogger(RespondedorAgente.class);

    static final String TEXTO_TRASPASO =
        "Gracias por escribirnos. Una persona del equipo continuará con usted en breve.";

    private final MotorAgente motor;
    private final CanalMensajeria canal;
    private final ConversacionService conversaciones;

    public RespondedorAgente(MotorAgente motor, CanalMensajeria canal, ConversacionService conversaciones) {
        this.motor = motor;
        this.canal = canal;
        this.conversaciones = conversaciones;
    }

    @Override
    public void responder(ConversacionActiva conv, MensajeEntrante mensaje) {
        PerfilAgente perfil = perfilDe(conv.perfil());
        if (perfil == null) return;
        if (perfil.alcance() == Alcance.EMPRESA && conv.empresaId() == null) {
            log.warn("[agente-ventas] {} sin empresa: no se responde", conv);
            return;
        }
        ContextoHerramienta contexto = new ContextoHerramienta(conv.empresaId(), conv.contacto(), perfil);
        ResultadoAgente r = motor.ejecutar(perfil, contexto, historialSinActual(conv), textoActual(conv, mensaje));

        String texto = r.texto();
        boolean traspaso = r.pasarAPersona();
        if (traspaso && texto.isBlank()) texto = TEXTO_TRASPASO;
        if (texto.isBlank()) return;

        canal.enviarTexto(conv.cuenta(), conv.contacto(), texto);
        conversaciones.registrarSalienteBot(conv.sesionId(), conv.empresaId(), texto);
        if (traspaso) {
            conversaciones.pausarBot(conv.sesionId(), conv.empresaId());
        }
    }

    static PerfilAgente perfilDe(PerfilConversacion p) {
        if (p == null) return null;
        return switch (p) {
            case NEGOCIO_VENTAS -> PerfilAgente.NEGOCIO_VENTAS;
            case NEGOCIO_INTERNO -> PerfilAgente.NEGOCIO_INTERNO;
            case HOTCLICK -> PerfilAgente.HOTCLICK;
            case ASESOR_WEB -> PerfilAgente.ASESOR_WEB;
        };
    }

    /** El último turno del historial es el mensaje actual: se pasa aparte al motor. */
    static List<TurnoConversacion> historialSinActual(ConversacionActiva conv) {
        List<ConversacionActiva.Turno> h = conv.historial() == null ? List.of() : conv.historial();
        int fin = h.size();
        if (fin > 0 && ConversacionMensaje.ROL_CLIENTE.equals(h.get(fin - 1).rol())) fin--;
        List<TurnoConversacion> out = new ArrayList<>();
        for (ConversacionActiva.Turno t : h.subList(0, fin)) {
            boolean usuario = ConversacionMensaje.ROL_CLIENTE.equals(t.rol());
            out.add(usuario ? TurnoConversacion.usuario(t.texto()) : TurnoConversacion.asistente(t.texto()));
        }
        return out;
    }

    static String textoActual(ConversacionActiva conv, MensajeEntrante mensaje) {
        if (mensaje != null && mensaje.texto() != null && !mensaje.texto().isBlank()) return mensaje.texto();
        List<ConversacionActiva.Turno> h = conv.historial();
        if (h != null && !h.isEmpty() && ConversacionMensaje.ROL_CLIENTE.equals(h.get(h.size() - 1).rol())) {
            return h.get(h.size() - 1).texto();
        }
        return "";
    }
}
