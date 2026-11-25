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

    /**
     * Texto con UN botón que abre un enlace (WhatsApp: botón de llamada a la acción; título ≤ 20). Por defecto, el
     * texto seguido del enlace. Solo para enlaces https del propio HotClick: nunca datos del cliente en la URL.
     */
    default String enviarBotonUrl(CanalCuenta cuenta, String destinatario, String texto, String tituloBoton, String url) {
        return enviarTexto(cuenta, destinatario, texto + "\n" + url);
    }

    /** Lista de hasta 10 filas (WhatsApp). Por defecto, texto con lista numerada. */
    default String enviarLista(CanalCuenta cuenta, String destinatario, String texto, String textoBoton,
                               java.util.List<FilaLista> filas) {
        return enviarTexto(cuenta, destinatario, MensajesInteractivos.respaldoLista(texto, filas));
    }

    /**
     * Plantilla aprobada de Meta (solo WhatsApp), la única forma de escribir fuera de la ventana de 24 h. Por defecto
     * no está soportada: quien llama debe comprobar antes que la cuenta es de WhatsApp.
     * @return id del mensaje (o "simulado")
     * @throws UnsupportedOperationException si el canal no tiene plantillas
     */
    default String enviarPlantilla(CanalCuenta cuenta, String destinatario,
                                   com.hotclick.service.whatsapp.PlantillaMeta plantilla, java.util.List<String> parametros) {
        throw new UnsupportedOperationException("El canal no admite plantillas");
    }
}
