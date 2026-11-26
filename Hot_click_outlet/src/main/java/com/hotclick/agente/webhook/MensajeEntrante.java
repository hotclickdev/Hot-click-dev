package com.hotclick.agente.webhook;

/**
 * Mensaje entrante normalizado desde un webhook de Meta, sin importar el canal.
 *
 * @param canal       WHATSAPP, INSTAGRAM o MESSENGER
 * @param cuentaId    cuenta que recibe: phone_number_id (WhatsApp), id de página (Messenger) o id de Instagram
 * @param remitenteId quién escribe: teléfono wa_id (WhatsApp), PSID (Messenger) o IGSID (Instagram)
 * @param nombre      nombre de perfil si Meta lo envía (puede ser null)
 * @param mensajeId   id único de Meta (wamid o mid); es la llave de deduplicación
 * @param tipo        text, interactive, button, audio, image, etc.
 * @param texto       texto del mensaje o título del botón elegido; null si no aplica (audio, imagen)
 * @param mediaId     adjunto si lo hay: id de media (WhatsApp) o URL temporal (Instagram, Messenger); null si no
 * @param epochSeg    marca de tiempo de Meta en segundos
 * @param botonId     id del botón o fila elegida (button_reply/list_reply/button.payload/postback/quick_reply);
 *                    null si el mensaje no viene de un botón. {@code texto} conserva el título visible.
 */
public record MensajeEntrante(
        Canal canal,
        String cuentaId,
        String remitenteId,
        String nombre,
        String mensajeId,
        String tipo,
        String texto,
        String mediaId,
        long epochSeg,
        String botonId) {

    /** Compatibilidad: mensaje sin botón. */
    public MensajeEntrante(Canal canal, String cuentaId, String remitenteId, String nombre, String mensajeId,
                           String tipo, String texto, String mediaId, long epochSeg) {
        this(canal, cuentaId, remitenteId, nombre, mensajeId, tipo, texto, mediaId, epochSeg, null);
    }

    public enum Canal { WHATSAPP, INSTAGRAM, MESSENGER }

    /** Nunca exponer remitente ni texto en logs (Ley 8968): solo canal, tipo y un id recortado. */
    @Override
    public String toString() {
        String id;
        if (mensajeId == null) {
            id = "?";
        } else if (mensajeId.length() <= 8) {
            id = "***";
        } else {
            id = "…" + mensajeId.substring(mensajeId.length() - 6);
        }
        return "MensajeEntrante[" + canal + ", tipo=" + tipo + ", id=" + id + "]";
    }
}
