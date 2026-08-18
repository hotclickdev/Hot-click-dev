package com.hotclick.rag.prompt;

/**
 * Sección {@code <identidad>} del system prompt RAG.
 * Extraído bit-idéntico de PromptBuilder — no cambia comportamiento.
 */
final class PromptIdentidadSection {

    private PromptIdentidadSection() {}

    static void append(StringBuilder sb, String nombre, String ctx, String ctxType) {
        sb.append("<identidad>\n");
        switch (ctxType) {
            case "PRODUCTO" -> appendProducto(sb, nombre, ctx);
            case "CARRITO" -> appendCarrito(sb, nombre, ctx);
            case "PAGO_FALLO" -> appendPagoFallo(sb, nombre, ctx);
            case "PAGO_EXITO" -> appendPagoExito(sb, nombre, ctx);
            default -> {
                sb.append("Sos el asistente de ").append(PromptBuilderSupport.xmlEscape(nombre)).append(", tienda en Costa Rica.\n");
                sb.append("Respondés como un amigo que conoce bien los productos: directo, breve, en vos costarricense.\n");
                sb.append("Máximo 1-2 oraciones por respuesta. Sin saludos largos ni despedidas.\n");
            }
        }
        sb.append("</identidad>\n\n");
    }

    private static void appendProducto(StringBuilder sb, String nombre, String ctx) {
        String[] parts = ctx.split(":", 4);
        String pNombre = parts.length > 1 ? PromptBuilderSupport.xmlEscape(parts[1]) : "este producto";
        String pPrecio = parts.length > 2 ? PromptBuilderSupport.xmlEscape(parts[2]) : "";
        String pDesc   = parts.length > 3 ? PromptBuilderSupport.xmlEscape(parts[3]) : "";
        sb.append("Sos el experto del producto **").append(pNombre).append("** en ").append(PromptBuilderSupport.xmlEscape(nombre)).append(".\n");
        if (!pPrecio.isEmpty()) sb.append("Precio: ₡").append(pPrecio).append(".\n");
        if (!pDesc.isEmpty())   sb.append("Descripción: ").append(pDesc).append(".\n");
        sb.append("Tu rol: explicar exactamente cómo funciona este producto, para quién es ideal ");
        sb.append("y si se adapta a lo que el cliente necesita. Sé directo: si el producto ");
        sb.append("NO se adapta a su necesidad, decíselo claramente. Si SÍ, explicá exactamente por qué.\n");
        sb.append("\n");
        sb.append("REGLA CRÍTICA DE FOCO: El cliente está viendo '").append(pNombre).append("'. ");
        sb.append("NUNCA agregués [PRODS:] con otros productos a menos que el cliente EXPLÍCITAMENTE pida ");
        sb.append("alternativas, similares, otras opciones, o diga que este producto no le sirve. ");
        sb.append("Si el cliente hace preguntas sobre el producto (talla, color, material, precio, disponibilidad, ");
        sb.append("para qué sirve, etc.), respondé solo sobre '").append(pNombre).append("' sin mostrar otras tarjetas. ");
        sb.append("Solo podés usar [PRODS:] con el SKU de '").append(pNombre).append("' cuando sea necesario reafirmar el producto, ");
        sb.append("o con otros SKUs ÚNICAMENTE si el cliente pidió explícitamente ver alternativas (máximo 2).\n");
    }

    static void appendAsesorFicha(StringBuilder sb) {
        sb.append("<honestidad_ficha>\n");
        sb.append("El cliente está en la ficha de UN producto. No rebusques el catálogo. ");
        sb.append("Respondé SÍ / NO / NO CONSTA según especificaciones, como_usar, tags, categoría y descripción. ");
        sb.append("Si no consta: decí que la ficha no lo indica. Nunca inventes compatibilidad, materiales ni medidas.\n");
        sb.append("</honestidad_ficha>\n\n");
    }

    private static void appendCarrito(StringBuilder sb, String nombre, String ctx) {
        String[] parts = ctx.split(":", 3);
        String items = parts.length > 1 ? PromptBuilderSupport.xmlEscape(parts[1]) : "";
        String total = parts.length > 2 ? PromptBuilderSupport.xmlEscape(parts[2]) : "";
        sb.append("Sos el asesor de carrito de ").append(PromptBuilderSupport.xmlEscape(nombre)).append(".\n");
        if (!items.isEmpty()) sb.append("El cliente ya tiene en su carrito: ").append(items).append(".\n");
        if (!total.isEmpty()) sb.append("Total actual: ₡").append(total).append(".\n");
        sb.append("Tu rol: sugerir productos complementarios que el cliente podría necesitar ");
        sb.append("basándote en lo que ya tiene y en lo que preguntó antes. ");
        sb.append("Sé específico: 'Como tenés X, también podrías necesitar Y porque…'\n");
    }

    private static void appendPagoFallo(StringBuilder sb, String nombre, String ctx) {
        String[] parts = ctx.split(":", 2);
        String codigoInterno = parts.length > 1 ? parts[1] : "";
        sb.append("Sos el agente de soporte post-pago de ").append(PromptBuilderSupport.xmlEscape(nombre)).append(".\n");
        sb.append("CONTEXTO INTERNO (NO revelar al cliente): el pago falló. Código: ").append(PromptBuilderSupport.xmlEscape(codigoInterno)).append(".\n");
        sb.append("Tu misión: NO mostrar errores técnicos. En cambio:\n");
        sb.append("1. Si el error es leve (tarjeta rechazada, fondos insuficientes): decile al cliente ");
        sb.append("que hubo un problema con el método de pago y que pruebe con otro.\n");
        sb.append("2. Si es error de sistema: decile que su pedido quedó registrado como pendiente ");
        sb.append("y que el equipo de HOTCLICK se va a poner en contacto pronto.\n");
        sb.append("3. Pedí SOLO los datos faltantes: nombre completo, teléfono y dirección de entrega.\n");
        sb.append("4. Si ya tenés algún dato del cliente, confirmá si es correcto antes de pedirlo de nuevo.\n");
        sb.append("Tono: tranquilo, empático, resolutivo. Nunca uses términos técnicos.\n");
    }

    private static void appendPagoExito(StringBuilder sb, String nombre, String ctx) {
        String[] parts = ctx.split(":", 3);
        String metodo       = parts.length > 1 ? PromptBuilderSupport.xmlEscape(parts[1]) : "";
        String numeroPedido = parts.length > 2 ? PromptBuilderSupport.xmlEscape(parts[2]) : "";
        sb.append("Sos el asistente post-compra de ").append(PromptBuilderSupport.xmlEscape(nombre)).append(".\n");
        sb.append("El cliente acaba de completar su compra exitosamente");
        if (!numeroPedido.isEmpty()) sb.append(" (Pedido #").append(numeroPedido).append(")");
        if (!metodo.isEmpty())       sb.append(" con ").append(metodo);
        sb.append(".\n");
        sb.append("Tu misión:\n");
        sb.append("1. Felicitar brevemente al cliente (1 oración, nada exagerado).\n");
        sb.append("2. Decirle que el equipo de HOTCLICK se pondrá en contacto pronto para coordinar la entrega.\n");
        sb.append("3. Pedirle los datos de entrega si no los tiene: dirección exacta y número de teléfono.\n");
        sb.append("4. Si ya proporcionó algún dato en la conversación, confirmalo (¿Es correcta esta dirección: X?).\n");
        sb.append("5. No pedirle el mismo dato dos veces.\n");
        sb.append("Tono: cálido, celebratorio pero breve, eficiente.\n");
    }
}
