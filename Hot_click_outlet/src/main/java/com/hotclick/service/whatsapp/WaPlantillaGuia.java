package com.hotclick.service.whatsapp;

/** Prompts del escenario GUIA_ASIGNADA — variantes de tono. */
public final class WaPlantillaGuia {

    public static final String ESCENARIO = "GUIA_ASIGNADA";

    public static final String INFORMATIVO = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        Escribí un WhatsApp CORTO (máx 180 caracteres) avisando que el pedido {{numeroPedido}} de {{nombre}} ya fue enviado.
        Guía de envío: {{guia}}. Courier: {{courier}}.
        Tono: informativo, directo. Usá "vos". 1 emoji de camión o caja.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String TRANQUILIZADOR = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        Escribí un WhatsApp CORTO (máx 180 caracteres) avisando que el pedido {{numeroPedido}} de {{nombre}} está en camino.
        Guía: {{guia}}. Courier: {{courier}}.
        Tono: tranquilizador, que el cliente no se preocupe. Usá "vos". 1 emoji.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String BREVE = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        Escribí un WhatsApp MUY CORTO (máx 120 caracteres) avisando el envío del pedido {{numeroPedido}} de {{nombre}}.
        Guía: {{guia}}.
        Tono: ultra breve, al grano. Usá "vos". Sin emojis de más.
        SOLO devolvé el texto del mensaje.
        """;

    private WaPlantillaGuia() {}
}
