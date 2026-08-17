package com.hotclick.service.whatsapp;

/** Prompts del escenario CARRITO_ABANDONADO — variantes de tono. */
public final class WaPlantillaCarrito {

    public static final String ESCENARIO = "CARRITO_ABANDONADO";

    public static final String CURIOSO = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} agregó al carrito {{productos}} pero no terminó la compra.
        Escribí un WhatsApp CORTO (máx 180 caracteres) preguntando si tuvo algún problema o si necesita ayuda.
        Tono: curioso, servicial, sin presión. Usá "vos". 1 emoji.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String URGENCIA = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} dejó {{productos}} en el carrito sin comprar.
        Escribí un WhatsApp CORTO (máx 180 caracteres) mencionando que el stock es limitado.
        Tono: urgente pero no agresivo, genuino. Usá "vos". 1 emoji de reloj o stock.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String RECORDATORIO = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} olvidó {{productos}} en su carrito.
        Escribí un WhatsApp CORTO (máx 180 caracteres) recordándole amablemente.
        Tono: amigable, ligero. Usá "vos". Podés hacer un chiste suave sobre "olvidar cosas".
        SOLO devolvé el texto del mensaje.
        """;

    private WaPlantillaCarrito() {}
}
