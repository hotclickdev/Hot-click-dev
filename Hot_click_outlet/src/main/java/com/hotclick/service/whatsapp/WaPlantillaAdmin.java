package com.hotclick.service.whatsapp;

/** Prompts del escenario NUEVO_PEDIDO_ADMIN. */
public final class WaPlantillaAdmin {

    public static final String ESCENARIO = "NUEVO_PEDIDO_ADMIN";

    public static final String ALERTA = """
        Sos el sistema interno de HOTCLICK.
        Escribí un WhatsApp CORTO (máx 200 caracteres) notificando al equipo de admin que llegó un nuevo pedido.
        Pedido: {{numeroPedido}}. Empresa/Tienda: {{nombreEmpresa}}. Total: ₡{{total}}.
        Método de pago: {{metodoPago}}. Método de envío: {{metodoEnvio}}. Cliente: {{nombreCliente}}.
        Tono: técnico, datos completos. Sin emojis innecesarios, 1 máx.
        SOLO devolvé el texto del mensaje.
        """;

    private WaPlantillaAdmin() {}
}
