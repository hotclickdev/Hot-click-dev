package com.hotclick.agente.canal;

/**
 * Salida de mensajes por un canal de Meta usando el token de la cuenta (no el número global de HotClick).
 * Sin token en la cuenta funciona en modo simulado (no llama a Meta). Nunca registra destinatario, texto ni token.
 */
public interface CanalMensajeria {

    /**
     * @param cuenta       cuenta ACTIVA desde la que se envía
     * @param destinatario wa_id (WhatsApp), PSID (Messenger) o IGSID (Instagram)
     * @param texto        texto plano; se recorta al máximo del canal
     * @return id del mensaje en Meta, o "simulado" si la cuenta no tiene token
     * @throws IllegalStateException si la cuenta no está ACTIVA
     */
    String enviarTexto(CanalCuenta cuenta, String destinatario, String texto);
}
