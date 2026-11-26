package com.hotclick.agente.canal;

import com.hotclick.agente.idioma.Idioma;

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
        return enviarBotones(cuenta, destinatario, texto, botones, Idioma.ES);
    }

    /** Igual que la versión sin idioma; el idioma solo afecta al respaldo en texto. */
    default String enviarBotones(CanalCuenta cuenta, String destinatario, String texto, java.util.List<Boton> botones,
                                 Idioma idioma) {
        return enviarTexto(cuenta, destinatario, MensajesInteractivos.respaldoBotones(texto, botones, idioma));
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
        return enviarLista(cuenta, destinatario, texto, textoBoton, filas, Idioma.ES);
    }

    /** Igual que la lista sin idioma; el idioma solo afecta al respaldo en texto. */
    default String enviarLista(CanalCuenta cuenta, String destinatario, String texto, String textoBoton,
                               java.util.List<FilaLista> filas, Idioma idioma) {
        return enviarTexto(cuenta, destinatario, MensajesInteractivos.respaldoLista(texto, filas, idioma));
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

    /** Producto de un catálogo de Meta: {@code metaProductoId} solo lo usan Instagram y Messenger (puede ser null). */
    record ReferenciaCatalogo(String catalogoId, String retailerId, String metaProductoId) { }

    /**
     * Tarjeta nativa de producto del catálogo de Meta (WhatsApp: mensaje {@code product}; Instagram y Messenger:
     * plantilla {@code product}). Si el canal no la admite o Meta la rechaza, cae a {@code respaldo} con
     * {@link #enviarProducto}. Por defecto solo manda el respaldo.
     */
    default String enviarProductoCatalogo(CanalCuenta cuenta, String destinatario, ReferenciaCatalogo ref,
                                          TarjetaProducto respaldo) {
        return enviarProducto(cuenta, destinatario, respaldo);
    }

    /**
     * Varios productos del catálogo en un solo mensaje (WhatsApp {@code product_list}, hasta 30). Por defecto y como
     * respaldo manda cada tarjeta de {@code respaldos} (máx. 3) con {@link #enviarProducto}.
     */
    default String enviarListaProductosCatalogo(CanalCuenta cuenta, String destinatario, String catalogoId,
                                                String titulo, String cuerpo, java.util.List<String> retailerIds,
                                                java.util.List<TarjetaProducto> respaldos) {
        String ultimo = "ok";
        int n = 0;
        for (TarjetaProducto t : respaldos == null ? java.util.List.<TarjetaProducto>of() : respaldos) {
            if (n++ == 3) break;
            ultimo = enviarProducto(cuenta, destinatario, t);
        }
        return ultimo;
    }

    /**
     * Plantilla de categoría MARKETING ya aprobada por Meta (solo WhatsApp). Cada envío lo cobra Meta al negocio.
     * Por defecto no está soportada.
     * @return id del mensaje (wamid) o "simulado" si la cuenta no tiene token
     * @throws UnsupportedOperationException si el canal no tiene plantillas
     */
    default String enviarPlantillaMarketing(CanalCuenta cuenta, String destinatario, String nombrePlantilla,
                                            String idioma, java.util.List<String> parametros) {
        throw new UnsupportedOperationException("El canal no admite plantillas");
    }
}
