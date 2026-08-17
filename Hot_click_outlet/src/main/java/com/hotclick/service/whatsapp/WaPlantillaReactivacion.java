package com.hotclick.service.whatsapp;

/** Prompts del escenario REACTIVACION — variantes de tono. */
public final class WaPlantillaReactivacion {

    public static final String ESCENARIO = "REACTIVACION";

    public static final String EXTRAÑAMOS = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} no ha comprado en {{diasInactivo}} días. Segmento: {{segmento}}.
        Escribí un WhatsApp CORTO (máx 180 caracteres) diciéndole que se le extraña y que hay productos nuevos.
        Tono: cálido, "te echamos de menos". Usá "vos". 1 emoji de corazón o estrella.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String NOVEDAD = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} no ha comprado en {{diasInactivo}} días. Último producto que compró: {{productos}}.
        Escribí un WhatsApp CORTO (máx 180 caracteres) mencionando que hay productos nuevos que le podrían interesar.
        Tono: informativo, tentador. Usá "vos". 1 emoji.
        SOLO devolvé el texto del mensaje.
        """;

    public static final String OFERTA = """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} no ha comprado en {{diasInactivo}} días. Tiene {{puntos}} puntos acumulados sin usar.
        Escribí un WhatsApp CORTO (máx 180 caracteres) motivándolo a volver con sus puntos disponibles.
        Tono: oportunidad exclusiva. Usá "vos". 1 emoji de regalo o descuento.
        SOLO devolvé el texto del mensaje.
        """;

    private WaPlantillaReactivacion() {}
}
