package com.hotclick.agente.idioma;

import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AG-39: idioma de una conversación a partir de los mensajes anteriores del cliente. Un solo lugar para quien manda
 * un texto fijo sin tener el mensaje del cliente a mano (encuesta, opt-in, STOP, voz, comprobante). Nunca guarda el
 * idioma ni lee más que los últimos mensajes; español si no hay pistas o no se encuentra la conversación.
 */
@Component
public class IdiomaConversacion {

    private final ConversacionMensajeRepository mensajes;
    private final ConversacionSesionRepository sesiones;

    public IdiomaConversacion(ConversacionMensajeRepository mensajes, ConversacionSesionRepository sesiones) {
        this.mensajes = mensajes;
        this.sesiones = sesiones;
    }

    /** Idioma de los últimos mensajes del cliente en la sesión. */
    public Idioma deSesion(UUID sesionId) {
        if (sesionId == null) return Idioma.ES;
        return deMensajes(mensajes.findTop20BySesionIdOrderByIdDesc(sesionId));
    }

    /** @param recientesPrimero mensajes de la sesión (de cualquier rol), del más reciente al más antiguo */
    public static Idioma deMensajes(List<ConversacionMensaje> recientesPrimero) {
        List<String> clientes = new ArrayList<>();
        for (ConversacionMensaje m : recientesPrimero) {
            if (ConversacionMensaje.ROL_CLIENTE.equals(m.getRol())) clientes.add(m.getContenido());
        }
        return deTextos(clientes);
    }

    /** Idioma de la conversación más reciente del contacto en esa cuenta (abierta o cerrada). */
    public Idioma deContacto(Long canalCuentaId, String contacto) {
        if (canalCuentaId == null || contacto == null) return Idioma.ES;
        return sesiones.findFirstByCanalCuentaIdAndContactoExternoOrderByUltimoMensajeEnDesc(canalCuentaId, contacto)
            .map(s -> deSesion(s.getId())).orElse(Idioma.ES);
    }

    /** Para quien ya tiene la conversación cargada (el historial va del más antiguo al más reciente). */
    public static Idioma deHistorial(ConversacionActiva conv) {
        List<String> previos = new ArrayList<>();
        if (conv != null && conv.historial() != null) {
            for (ConversacionActiva.Turno t : conv.historial()) {
                if (ConversacionMensaje.ROL_CLIENTE.equals(t.rol()) && t.texto() != null) previos.add(0, t.texto());
            }
        }
        return deTextos(previos);
    }

    /** @param clientesRecientesPrimero mensajes del cliente, del más reciente al más antiguo */
    public static Idioma deTextos(List<String> clientesRecientesPrimero) {
        return Idioma.detectar(null, clientesRecientesPrimero);
    }
}
