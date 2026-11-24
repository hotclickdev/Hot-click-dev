package com.hotclick.agente.conversacion;

import com.hotclick.agente.canal.CanalCuenta;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Contexto que recibe un {@link com.hotclick.agente.conversacion.spi.AgenteRespondedor} para contestar.
 *
 * @param sesionId             conversación (hot_click_chat_sesion_tb)
 * @param perfil               qué bot atiende
 * @param empresaId            negocio dueño de la cuenta; null para el bot de HotClick
 * @param cuenta               cuenta por la que se contesta (se pasa tal cual a {@code CanalMensajeria.enviarTexto})
 * @param contacto             wa_id, PSID o IGSID de quien escribe; es el destinatario de la respuesta
 * @param usuarioId            usuario del negocio si el remitente es personal vinculado (NEGOCIO_INTERNO); si no, null
 * @param modo                 BOT o PERSONA (el enrutador solo invoca al bot en BOT)
 * @param ultimoMensajeCliente cuándo escribió el cliente por última vez (ventana de 24 h de WhatsApp)
 * @param historial            hasta 20 turnos recientes, del más antiguo al más reciente; el último es el mensaje actual
 */
public record ConversacionActiva(
        UUID sesionId,
        PerfilConversacion perfil,
        Long empresaId,
        CanalCuenta cuenta,
        String contacto,
        Long usuarioId,
        ModoConversacion modo,
        Instant ultimoMensajeCliente,
        List<Turno> historial) {

    /** Ventana de servicio de WhatsApp: pasadas 24 h del último mensaje del cliente, solo plantillas aprobadas. */
    public static final Duration VENTANA = Duration.ofHours(24);

    /** rol: user | assistant | persona. */
    public record Turno(String rol, String texto, Instant fecha) {
        @Override
        public String toString() { return "Turno[rol=" + rol + "]"; }
    }

    public boolean dentroDeVentana() {
        return dentroDeVentana(Instant.now());
    }

    public boolean dentroDeVentana(Instant ahora) {
        return ultimoMensajeCliente != null && !ahora.isAfter(ultimoMensajeCliente.plus(VENTANA));
    }

    /** Sin contacto ni texto del historial en logs (Ley 8968). */
    @Override
    public String toString() {
        return "ConversacionActiva[sesion=" + sesionId + ", perfil=" + perfil + ", modo=" + modo + "]";
    }
}
