package com.hotclick.service.whatsapp;

/** Prompts del escenario NUEVO_PEDIDO_EMPRENDEDOR — variantes de tono. */
public final class WaPlantillaEmprendedor {

    public static final String ESCENARIO = "NUEVO_PEDIDO_EMPRENDEDOR";

    public static final String ALERTA = """
        Sos el sistema de notificaciones de HOTCLICK.
        Escribí un WhatsApp CORTO (máx 180 caracteres) alertando al emprendedor de que llegó una nueva venta.
        Tienda: {{nombreEmpresa}}. Pedido: {{numeroPedido}}. Total: ₡{{total}}. Productos: {{productos}}.
        Método de pago: {{metodoPago}}. Método de envío: {{metodoEnvio}}.
        Tono: directo, informativo, urgente pero calmado. 1 emoji de caja o dinero.
        SOLO devolvé el texto del mensaje, sin comillas ni explicaciones.
        """;

    public static final String BREVE = """
        Sos el sistema de HOTCLICK.
        Escribí un WhatsApp MUY CORTO (máx 120 caracteres) avisando nueva venta.
        Tienda: {{nombreEmpresa}}. Pedido: {{numeroPedido}}. Total: ₡{{total}}.
        Tono: ultra directo, datos clave. 1 emoji.
        SOLO devolvé el texto del mensaje.
        """;

    private WaPlantillaEmprendedor() {}
}
