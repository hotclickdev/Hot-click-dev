package com.hotclick.agente.webhook;

import java.util.List;

/**
 * Eventos de estado del webhook de Meta que no son mensajes: los acuses de un mensaje enviado ({@code statuses}) y el
 * cambio de estado de una plantilla ({@code message_template_status_update}).
 */
public record EstadoEntrante(List<EstadoMensaje> mensajes, List<EstadoPlantilla> plantillas) {

    public static final EstadoEntrante VACIO = new EstadoEntrante(List.of(), List.of());

    public boolean sinEventos() {
        return mensajes.isEmpty() && plantillas.isEmpty();
    }

    /**
     * @param mensajeId   wamid del mensaje enviado
     * @param estado      sent, delivered, read o failed (minúsculas)
     * @param epochSeg    marca de tiempo de Meta en segundos
     * @param codigoError código de error de Meta si falló; 0 si no
     */
    public record EstadoMensaje(String mensajeId, String estado, long epochSeg, int codigoError) {
        /** Sin el destinatario: el acuse nunca lo trae aquí. */
        @Override
        public String toString() {
            return "EstadoMensaje[" + estado + "]";
        }
    }

    /**
     * @param plantillaId id de la plantilla en Meta
     * @param nombre      nombre técnico
     * @param evento      APPROVED, REJECTED, PENDING, PAUSED, DISABLED… (mayúsculas)
     * @param razon       código de motivo de rechazo de Meta o null
     */
    public record EstadoPlantilla(String plantillaId, String nombre, String evento, String razon) { }
}
