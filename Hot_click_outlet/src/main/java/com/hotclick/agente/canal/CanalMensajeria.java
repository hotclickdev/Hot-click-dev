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

    /**
     * Producto con foto, nombre, precio en colones (es-CR) y botones. Por defecto cae a texto con opciones numeradas.
     * @return id del mensaje (o "simulado")
     */
    default String enviarProducto(CanalCuenta cuenta, String destinatario, TarjetaProducto producto) {
        return enviarTexto(cuenta, destinatario, MensajesInteractivos.respaldoProducto(producto));
    }

    /** Texto con botones (WhatsApp: máx. 3, ids ≤ 256, títulos ≤ 20). Por defecto, texto con lista numerada. */
    default String enviarBotones(CanalCuenta cuenta, String destinatario, String texto, java.util.List<Boton> botones) {
        return enviarTexto(cuenta, destinatario, MensajesInteractivos.respaldoBotones(texto, botones));
    }

    /** Lista de hasta 10 filas (WhatsApp). Por defecto, texto con lista numerada. */
    default String enviarLista(CanalCuenta cuenta, String destinatario, String texto, String textoBoton,
                               java.util.List<FilaLista> filas) {
        return enviarTexto(cuenta, destinatario, MensajesInteractivos.respaldoLista(texto, filas));
    }
}
