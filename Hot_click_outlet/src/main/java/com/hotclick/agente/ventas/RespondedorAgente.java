package com.hotclick.agente.ventas;

import com.hotclick.agente.canal.Boton;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.RespuestaBoton;
import com.hotclick.agente.catalogo.TarjetasCatalogoService;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.Alcance;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.OpcionesMotor;
import com.hotclick.agente.panel.AgenteConfigDto;
import com.hotclick.agente.panel.AgenteConfigService;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.motor.TurnoConversacion;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
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
    private final AgenteConfigService config;
    private final ObjectProvider<TarjetasCatalogoService> tarjetas;

    public RespondedorAgente(MotorAgente motor, CanalMensajeria canal, ConversacionService conversaciones,
                             AgenteConfigService config) {
        this(motor, canal, conversaciones, config, null);
    }

    @Autowired // con dos constructores Spring no elige solo
    public RespondedorAgente(MotorAgente motor, CanalMensajeria canal, ConversacionService conversaciones,
                             AgenteConfigService config, ObjectProvider<TarjetasCatalogoService> tarjetas) {
        this.motor = motor;
        this.canal = canal;
        this.conversaciones = conversaciones;
        this.config = config;
        this.tarjetas = tarjetas;
    }

    @Override
    public void responder(ConversacionActiva conv, MensajeEntrante mensaje) {
        PerfilAgente perfil = perfilDe(conv.perfil());
        if (perfil == null) return;
        if (perfil.alcance() == Alcance.EMPRESA && conv.empresaId() == null) {
            log.warn("[agente-ventas] {} sin empresa: no se responde", conv);
            return;
        }
        // AG-19: tono, activo y horario del negocio (sin configuración: valores por defecto de las propiedades).
        AgenteConfigDto cfg = config.obtener(conv.empresaId());
        if (!cfg.activo()) {
            log.info("[agente-ventas] {} bot desactivado por el negocio: no se responde", conv);
            return;
        }
        boolean fueraDeHorario = config.fueraDeHorario(cfg, Instant.now());
        ContextoHerramienta contexto = new ContextoHerramienta(conv.empresaId(), conv.contacto(), perfil, null,
            canalDe(conv, mensaje), conv.sesionId());
        String entrada = textoActual(conv, mensaje);
        // El id del botón (comprar:42, ver:7, persona) llega aparte del título visible.
        Optional<RespuestaBoton> boton = mensaje != null && mensaje.botonId() != null
            ? RespuestaBoton.parsear(mensaje.botonId())
            : RespuestaBoton.parsear(entrada);
        if (boton.isEmpty() && esTituloHablarConPersona(entrada)) {
            boton = Optional.of(new RespuestaBoton(RespuestaBoton.Tipo.HABLAR_CON_PERSONA, null));
        }
        if (boton.isPresent()) {
            switch (boton.get().tipo()) {
                case HABLAR_CON_PERSONA -> {
                    // Traspaso directo: no se llama a Claude.
                    enviar(conv, fueraDeHorario ? config.mensajeFueraHorario(cfg) : TEXTO_TRASPASO);
                    conversaciones.pausarBot(conv.sesionId(), conv.empresaId());
                    return;
                }
                case COMPRAR -> entrada = "quiero comprar el producto " + boton.get().productoId();
                case VER_MAS -> entrada = "quiero ver más del producto " + boton.get().productoId();
            }
        }
        ResultadoAgente r = motor.ejecutar(perfil, contexto, historialSinActual(conv), entrada,
            OpcionesMotor.conTono(config.tonoDe(cfg)));

        String texto = r.texto();
        boolean traspaso = r.pasarAPersona();
        if (traspaso && texto.isBlank()) texto = TEXTO_TRASPASO;
        // Fuera de horario el bot sigue vendiendo; solo el traspaso a persona avisa que responden al abrir.
        if (traspaso && fueraDeHorario) texto = config.mensajeFueraHorario(cfg);
        // Si se creó el enlace y el texto no lo trae, se agrega: el cliente siempre debe recibirlo.
        String enlace = r.acciones().stream()
            .filter(a -> a.tipo() == AccionAgente.Tipo.ENLACE_CREADO).map(AccionAgente::dato)
            .filter(u -> u != null && !u.isBlank()).findFirst().orElse(null);
        if (enlace != null && !texto.contains(enlace)) texto = (texto.isBlank() ? "" : texto + "\n") + enlace;
        if (texto.isBlank()) return;

        enviar(conv, texto);
        enviarTarjetas(conv, r);
        if (traspaso) {
            conversaciones.pausarBot(conv.sesionId(), conv.empresaId());
        }
    }

    /** AG-37: tarjetas nativas del catálogo de Meta si el bot las pidió; sin catálogo conectado no se envía nada. */
    private void enviarTarjetas(ConversacionActiva conv, ResultadoAgente r) {
        TarjetasCatalogoService t = tarjetas == null ? null : tarjetas.getIfAvailable();
        if (t == null || conv.empresaId() == null) return;
        List<Long> ids = new ArrayList<>();
        for (AccionAgente a : r.acciones()) {
            if (a.tipo() != AccionAgente.Tipo.MOSTRAR_PRODUCTOS || a.dato() == null) continue;
            for (String s : a.dato().split(",")) {
                try {
                    ids.add(Long.parseLong(s.strip()));
                } catch (NumberFormatException e) {
                    log.debug("[agente-ventas] id de producto inválido en la acción");
                }
            }
        }
        if (ids.isEmpty()) return;
        if (t.enviar(conv.cuenta(), conv.contacto(), ids)) {
            conversaciones.registrarSalienteBot(conv.sesionId(), conv.empresaId(), "[Tarjetas de producto]");
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
