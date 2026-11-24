package com.hotclick.agente.interno;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.spi.RespondedorInterno;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.motor.TurnoConversacion;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.dto.AccionPropuestaTelegram;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

/**
 * Respondedor del perfil NEGOCIO_INTERNO: llama al motor con las herramientas internas y compone la respuesta.
 * Si el turno dejó una propuesta o una espera de PIN, el texto lo fija el sistema (no el modelo): resumen +
 * "Respondé SÍ para confirmar", o la petición del PIN. Modo de fallo: si Claude no responde, un aviso corto
 * (el mensaje del usuario ya quedó guardado); nunca se pausa el bot ni se deriva a un cliente.
 */
@Component
public class RespondedorInternoImpl implements RespondedorInterno {

    private static final Logger log = LoggerFactory.getLogger(RespondedorInternoImpl.class);

    static final String MSG_FALLO = "No pude consultarlo en este momento. Probá de nuevo en unos minutos.";
    static final String MSG_SOLO_TEXTO = "Por ahora solo entiendo mensajes de texto.";
    static final String MSG_SIN_VINCULO = "Este teléfono ya no está vinculado a un usuario del negocio.";
    static final String MSG_PEDIR_PIN = "Para ver las finanzas enviame tu PIN (4 a 6 dígitos). No lo compartas con nadie.";

    private final MotorAgente motor;
    private final VinculacionInternaService vinculaciones;
    private final ConversacionMensajeRepository mensajes;
    private final CanalMensajeria mensajeria;
    private final ObjectMapper mapper;

    public RespondedorInternoImpl(MotorAgente motor, VinculacionInternaService vinculaciones,
                                  ConversacionMensajeRepository mensajes, CanalMensajeria mensajeria,
                                  ObjectMapper mapper) {
        this.motor = motor;
        this.vinculaciones = vinculaciones;
        this.mensajes = mensajes;
        this.mensajeria = mensajeria;
        this.mapper = mapper;
    }

    @Override
    public void responder(ConversacionActiva conv, MensajeEntrante mensaje) {
        Optional<AgenteVinculacion> opt = vinculaciones.vinculacionActiva(conv.empresaId(), conv.contacto());
        if (opt.isEmpty()) { enviar(conv, MSG_SIN_VINCULO); return; }
        AgenteVinculacion v = opt.get();
        if (mensaje.texto() == null || mensaje.texto().isBlank()) { enviar(conv, MSG_SOLO_TEXTO); return; }

        List<ConversacionActiva.Turno> turnos = conv.historial();
        // El último turno es el mensaje actual: va aparte como entrada.
        List<TurnoConversacion> historial = IntStream.range(0, turnos.size() - 1)
            .mapToObj(i -> turnoMotor(turnos.get(i))).toList();
        ContextoHerramienta ctx = new ContextoHerramienta(conv.empresaId(), conv.contacto(), PerfilAgente.NEGOCIO_INTERNO);
        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_INTERNO, ctx, historial, mensaje.texto());

        AgenteVinculacion actual = vinculaciones.porId(v.getId());
        enviar(conv, componer(actual, r));
    }

    private static TurnoConversacion turnoMotor(ConversacionActiva.Turno t) {
        return ConversacionMensaje.ROL_CLIENTE.equals(t.rol())
            ? TurnoConversacion.usuario(t.texto()) : TurnoConversacion.asistente(t.texto());
    }

    private String componer(AgenteVinculacion v, ResultadoAgente r) {
        Instant ahora = vinculaciones.ahora();
        if (v.pendienteVigente(ahora)) {
            if (AgenteVinculacion.PEND_CONFIRMAR.equals(v.getPendienteTipo())) {
                String resumen = resumen(v.getPendienteJson());
                if (resumen != null)
                    return resumen + "\nRespondé SÍ para confirmar o NO para cancelar.";
            } else if (AgenteVinculacion.PEND_PIN_FINANZAS.equals(v.getPendienteTipo())) {
                return MSG_PEDIR_PIN;
            }
        }
        return r.motivoFin() == MotivoFin.COMPLETO ? r.texto() : MSG_FALLO;
    }

    private String resumen(String json) {
        if (json == null) return null;
        try {
            return mapper.readValue(json, AccionPropuestaTelegram.class).resumen();
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private void enviar(ConversacionActiva conv, String texto) {
        ConversacionMensaje m = new ConversacionMensaje();
        m.setSesionId(conv.sesionId());
        m.setEmpresaId(conv.empresaId());
        m.setRol(ConversacionMensaje.ROL_BOT);
        m.setContenido(texto);
        m.setFechaCreacion(Instant.now());
        mensajes.save(m);
        try {
            mensajeria.enviarTexto(conv.cuenta(), conv.contacto(), texto);
        } catch (RuntimeException e) {
            log.warn("[agente-interno] no se pudo enviar la respuesta ({}) en {}", e.getClass().getSimpleName(), conv);
        }
    }
}
