package com.hotclick.service.whatsapp;

/** Prompts del escenario POST_ENTREGA_RESENA — variantes de tono. */
public final class WaPlantillaResena {

    public static final String ESCENARIO = "POST_ENTREGA_RESENA";

    public static final String AGRADECIDO = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} recibió su pedido hace unos días ({{productos}}).
        Escribí un WhatsApp CORTO (máx 180 caracteres) pidiéndole una reseña/opinión del producto.
        Tono: agradecido, genuino. Usá "vos". Mencioná que su opinión ayuda a otros clientes.
        Segmento: {{segmento}}. Si es VIP, destacá que su opinión vale extra.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String CASUAL = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} recibió su pedido ({{productos}}).
        Escribí un WhatsApp CORTO (máx 180 caracteres) preguntando cómo le fue con el producto, de forma casual.
        Tono: amigable, sin presión. Usá "vos". Como si fuera un amigo preguntando.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String PUNTOS = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} recibió su pedido ({{productos}}). Tiene {{puntos}} puntos de fidelidad acumulados.
        Escribí un WhatsApp CORTO (máx 180 caracteres) pidiéndole una reseña y mencionando que gana puntos extra por dejarla.
        Tono: motivador, orientado al beneficio. Usá "vos".
        SOLO devolvé el texto del mensaje.
        """;

    private WaPlantillaResena() {}
}
