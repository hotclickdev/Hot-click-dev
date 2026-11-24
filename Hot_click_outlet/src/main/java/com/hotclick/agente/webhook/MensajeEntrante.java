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
        long epochSeg) {

    public enum Canal { WHATSAPP, INSTAGRAM, MESSENGER }

    /** Nunca exponer remitente ni texto en logs (Ley 8968): solo canal, tipo y un id recortado. */
    @Override
    public String toString() {
        String id = mensajeId == null ? "?" : (mensajeId.length() <= 8 ? "***" : "…" + mensajeId.substring(mensajeId.length() - 6));
        return "MensajeEntrante[" + canal + ", tipo=" + tipo + ", id=" + id + "]";
    }
}
