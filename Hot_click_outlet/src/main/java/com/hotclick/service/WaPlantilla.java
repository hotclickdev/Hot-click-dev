package com.hotclick.service;

/**
 * 15 estructuras base (5 escenarios × 3 variantes de tono).
 * Gemini toma el prompt de cada variante y genera el texto final personalizado.
 * Resultado: cada cliente recibe un mensaje diferente según su contexto y segmento.
 */
public enum WaPlantilla {

    // ── 1. CONFIRMACIÓN DE PEDIDO ─────────────────────────────────────────────

    CONFIRMACION_CALIDO(
        "CONFIRMACION_PEDIDO",
        """
        Sos el asistente de HOTCLICK, tienda online en Costa Rica.
        Escribí un mensaje de WhatsApp CORTO (máx 160 caracteres) confirmando el pedido de {{nombre}}.
        Pedido: {{numeroPedido}}. Total: ₡{{total}}. Productos: {{productos}}.
        Tono: cálido, como si fuera un amigo que les confirma. Usá "vos". Incluí 1 emoji relevante.
        Segmento del cliente: {{segmento}}. Para VIP sé más exclusivo, para NUEVO sé más bienvenido.
        SOLO devolvé el texto del mensaje, sin comillas ni explicaciones.
        """
    ),
    CONFIRMACION_PROFESIONAL(
        "CONFIRMACION_PEDIDO",
        """
        Sos el asistente de HOTCLICK, tienda online en Costa Rica.
        Escribí un mensaje de WhatsApp CORTO (máx 160 caracteres) confirmando el pedido de {{nombre}}.
        Pedido: {{numeroPedido}}. Total: ₡{{total}}. Productos: {{productos}}.
        Tono: profesional y claro, enfocado en la información. Usá "vos". Incluí 1 emoji.
        Segmento: {{segmento}}.
        SOLO devolvé el texto del mensaje, sin comillas ni explicaciones.
        """
    ),
    CONFIRMACION_ENERGICO(
        "CONFIRMACION_PEDIDO",
        """
        Sos el asistente de HOTCLICK, tienda online en Costa Rica.
        Escribí un mensaje de WhatsApp CORTO (máx 160 caracteres) confirmando el pedido de {{nombre}}.
        Pedido: {{numeroPedido}}. Total: ₡{{total}}. Productos: {{productos}}.
        Tono: entusiasta y enérgico, que el cliente se sienta emocionado. Usá "vos". 2 emojis máx.
        Segmento: {{segmento}}.
        SOLO devolvé el texto del mensaje, sin comillas ni explicaciones.
        """
    ),

    // ── 2. GUÍA ASIGNADA / PEDIDO EN CAMINO ──────────────────────────────────

    GUIA_INFORMATIVO(
        "GUIA_ASIGNADA",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        Escribí un WhatsApp CORTO (máx 180 caracteres) avisando que el pedido {{numeroPedido}} de {{nombre}} ya fue enviado.
        Guía de envío: {{guia}}. Courier: {{courier}}.
        Tono: informativo, directo. Usá "vos". 1 emoji de camión o caja.
        SOLO devolvé el texto del mensaje.
        """
    ),
    GUIA_TRANQUILIZADOR(
        "GUIA_ASIGNADA",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        Escribí un WhatsApp CORTO (máx 180 caracteres) avisando que el pedido {{numeroPedido}} de {{nombre}} está en camino.
        Guía: {{guia}}. Courier: {{courier}}.
        Tono: tranquilizador, que el cliente no se preocupe. Usá "vos". 1 emoji.
        SOLO devolvé el texto del mensaje.
        """
    ),
    GUIA_BREVE(
        "GUIA_ASIGNADA",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        Escribí un WhatsApp MUY CORTO (máx 120 caracteres) avisando el envío del pedido {{numeroPedido}} de {{nombre}}.
        Guía: {{guia}}.
        Tono: ultra breve, al grano. Usá "vos". Sin emojis de más.
        SOLO devolvé el texto del mensaje.
        """
    ),

    // ── 3. POST-ENTREGA — SOLICITUD DE RESEÑA ────────────────────────────────

    RESENA_AGRADECIDO(
        "POST_ENTREGA_RESENA",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} recibió su pedido hace unos días ({{productos}}).
        Escribí un WhatsApp CORTO (máx 180 caracteres) pidiéndole una reseña/opinión del producto.
        Tono: agradecido, genuino. Usá "vos". Mencioná que su opinión ayuda a otros clientes.
        Segmento: {{segmento}}. Si es VIP, destacá que su opinión vale extra.
        SOLO devolvé el texto del mensaje.
        """
    ),
    RESENA_CASUAL(
        "POST_ENTREGA_RESENA",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} recibió su pedido ({{productos}}).
        Escribí un WhatsApp CORTO (máx 180 caracteres) preguntando cómo le fue con el producto, de forma casual.
        Tono: amigable, sin presión. Usá "vos". Como si fuera un amigo preguntando.
        SOLO devolvé el texto del mensaje.
        """
    ),
    RESENA_PUNTOS(
        "POST_ENTREGA_RESENA",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} recibió su pedido ({{productos}}). Tiene {{puntos}} puntos de fidelidad acumulados.
        Escribí un WhatsApp CORTO (máx 180 caracteres) pidiéndole una reseña y mencionando que gana puntos extra por dejarla.
        Tono: motivador, orientado al beneficio. Usá "vos".
        SOLO devolvé el texto del mensaje.
        """
    ),

    // ── 4. CARRITO ABANDONADO ─────────────────────────────────────────────────

    CARRITO_CURIOSO(
        "CARRITO_ABANDONADO",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} agregó al carrito {{productos}} pero no terminó la compra.
        Escribí un WhatsApp CORTO (máx 180 caracteres) preguntando si tuvo algún problema o si necesita ayuda.
        Tono: curioso, servicial, sin presión. Usá "vos". 1 emoji.
        SOLO devolvé el texto del mensaje.
        """
    ),
    CARRITO_URGENCIA(
        "CARRITO_ABANDONADO",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} dejó {{productos}} en el carrito sin comprar.
        Escribí un WhatsApp CORTO (máx 180 caracteres) mencionando que el stock es limitado.
        Tono: urgente pero no agresivo, genuino. Usá "vos". 1 emoji de reloj o stock.
        SOLO devolvé el texto del mensaje.
        """
    ),
    CARRITO_RECORDATORIO(
        "CARRITO_ABANDONADO",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} olvidó {{productos}} en su carrito.
        Escribí un WhatsApp CORTO (máx 180 caracteres) recordándole amablemente.
        Tono: amigable, ligero. Usá "vos". Podés hacer un chiste suave sobre "olvidar cosas".
        SOLO devolvé el texto del mensaje.
        """
    ),

    // ── 5. NUEVO PEDIDO — EMPRENDEDOR ────────────────────────────────────────

    EMPRENDEDOR_ALERTA(
        "NUEVO_PEDIDO_EMPRENDEDOR",
        """
        Sos el sistema de notificaciones de HOTCLICK.
        Escribí un WhatsApp CORTO (máx 180 caracteres) alertando al emprendedor de que llegó una nueva venta.
        Tienda: {{nombreEmpresa}}. Pedido: {{numeroPedido}}. Total: ₡{{total}}. Productos: {{productos}}.
        Método de pago: {{metodoPago}}. Método de envío: {{metodoEnvio}}.
        Tono: directo, informativo, urgente pero calmado. 1 emoji de caja o dinero.
        SOLO devolvé el texto del mensaje, sin comillas ni explicaciones.
        """
    ),
    EMPRENDEDOR_BREVE(
        "NUEVO_PEDIDO_EMPRENDEDOR",
        """
        Sos el sistema de HOTCLICK.
        Escribí un WhatsApp MUY CORTO (máx 120 caracteres) avisando nueva venta.
        Tienda: {{nombreEmpresa}}. Pedido: {{numeroPedido}}. Total: ₡{{total}}.
        Tono: ultra directo, datos clave. 1 emoji.
        SOLO devolvé el texto del mensaje.
        """
    ),

    // ── 6. NUEVO PEDIDO — ADMIN IT ───────────────────────────────────────────

    ADMIN_ALERTA(
        "NUEVO_PEDIDO_ADMIN",
        """
        Sos el sistema interno de HOTCLICK.
        Escribí un WhatsApp CORTO (máx 200 caracteres) notificando al equipo de admin que llegó un nuevo pedido.
        Pedido: {{numeroPedido}}. Empresa/Tienda: {{nombreEmpresa}}. Total: ₡{{total}}.
        Método de pago: {{metodoPago}}. Método de envío: {{metodoEnvio}}. Cliente: {{nombreCliente}}.
        Tono: técnico, datos completos. Sin emojis innecesarios, 1 máx.
        SOLO devolvé el texto del mensaje.
        """
    ),

    // ── 7. REACTIVACIÓN (cliente inactivo 45+ días) ───────────────────────────

    REACTIVACION_EXTRAÑAMOS(
        "REACTIVACION",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} no ha comprado en {{diasInactivo}} días. Segmento: {{segmento}}.
        Escribí un WhatsApp CORTO (máx 180 caracteres) diciéndole que se le extraña y que hay productos nuevos.
        Tono: cálido, "te echamos de menos". Usá "vos". 1 emoji de corazón o estrella.
        SOLO devolvé el texto del mensaje.
        """
    ),
    REACTIVACION_NOVEDAD(
        "REACTIVACION",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} no ha comprado en {{diasInactivo}} días. Último producto que compró: {{productos}}.
        Escribí un WhatsApp CORTO (máx 180 caracteres) mencionando que hay productos nuevos que le podrían interesar.
        Tono: informativo, tentador. Usá "vos". 1 emoji.
        SOLO devolvé el texto del mensaje.
        """
    ),
    REACTIVACION_OFERTA(
        "REACTIVACION",
        """
        Sos el asistente de HOTCLICK, tienda en Costa Rica.
        {{nombre}} no ha comprado en {{diasInactivo}} días. Tiene {{puntos}} puntos acumulados sin usar.
        Escribí un WhatsApp CORTO (máx 180 caracteres) motivándolo a volver con sus puntos disponibles.
        Tono: oportunidad exclusiva. Usá "vos". 1 emoji de regalo o descuento.
        SOLO devolvé el texto del mensaje.
        """
    );

    public final String escenario;
    public final String promptTemplate;

    WaPlantilla(String escenario, String promptTemplate) {
        this.escenario = escenario;
        this.promptTemplate = promptTemplate;
    }

    /** Devuelve una variante aleatoria del escenario dado. */
    public static WaPlantilla varianteAleatoria(String escenario) {
        WaPlantilla[] variantes = java.util.Arrays.stream(values())
            .filter(p -> p.escenario.equals(escenario))
            .toArray(WaPlantilla[]::new);
        if (variantes.length == 0) return CONFIRMACION_CALIDO;
        return variantes[(int) (Math.random() * variantes.length)];
    }
}
