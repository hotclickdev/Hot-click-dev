package com.hotclick.agente.ventas;

import com.hotclick.agente.canal.Boton;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.RespuestaBoton;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.motor.AccionAgente;
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
import java.util.Optional;

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
        ContextoHerramienta contexto = new ContextoHerramienta(conv.empresaId(), conv.contacto(), perfil, null,
            canalDe(conv, mensaje), conv.sesionId());
        String entrada = textoActual(conv, mensaje);
        Optional<RespuestaBoton> boton = RespuestaBoton.parsear(entrada);
        if (boton.isEmpty() && esTituloHablarConPersona(entrada)) {
            boton = Optional.of(new RespuestaBoton(RespuestaBoton.Tipo.HABLAR_CON_PERSONA, null));
        }
        if (boton.isPresent()) {
            switch (boton.get().tipo()) {
                case HABLAR_CON_PERSONA -> {
                    // Traspaso directo: no se llama a Claude.
                    enviar(conv, TEXTO_TRASPASO);
                    conversaciones.pausarBot(conv.sesionId(), conv.empresaId());
                    return;
                }
                case COMPRAR -> entrada = "quiero comprar el producto " + boton.get().productoId();
                case VER_MAS -> entrada = "quiero ver más del producto " + boton.get().productoId();
            }
        }
        ResultadoAgente r = motor.ejecutar(perfil, contexto, historialSinActual(conv), entrada);

        String texto = r.texto();
        boolean traspaso = r.pasarAPersona();
        if (traspaso && texto.isBlank()) texto = TEXTO_TRASPASO;
        // Si se creó el enlace y el texto no lo trae, se agrega: el cliente siempre debe recibirlo.
        String enlace = r.acciones().stream()
            .filter(a -> a.tipo() == AccionAgente.Tipo.ENLACE_CREADO).map(AccionAgente::dato)
            .filter(u -> u != null && !u.isBlank()).findFirst().orElse(null);
        if (enlace != null && !texto.contains(enlace)) texto = (texto.isBlank() ? "" : texto + "\n") + enlace;
        if (texto.isBlank()) return;

        enviar(conv, texto);
        if (traspaso) {
            conversaciones.pausarBot(conv.sesionId(), conv.empresaId());
        }
    }

    private void enviar(ConversacionActiva conv, String texto) {
        canal.enviarTexto(conv.cuenta(), conv.contacto(), texto);
        conversaciones.registrarSalienteBot(conv.sesionId(), conv.empresaId(), texto);
    }

    static MensajeEntrante.Canal canalDe(ConversacionActiva conv, MensajeEntrante mensaje) {
        if (mensaje != null && mensaje.canal() != null) return mensaje.canal();
        return conv.cuenta() == null ? null : conv.cuenta().getTipo();
    }

    /** WhatsApp entrega el título del botón, no su id: el de traspaso se reconoce también por su título. */
    static boolean esTituloHablarConPersona(String texto) {
        return texto != null && texto.strip().equalsIgnoreCase(Boton.hablarConPersona().titulo());
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
