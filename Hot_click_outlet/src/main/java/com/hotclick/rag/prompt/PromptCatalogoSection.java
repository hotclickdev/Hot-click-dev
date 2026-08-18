package com.hotclick.rag.prompt;

import com.hotclick.rag.dto.ProductoContexto;

import java.util.List;

/**
 * Secciones de catálogo, categorías y memoria del system prompt RAG.
 */
final class PromptCatalogoSection {

    private PromptCatalogoSection() {}

    static void appendMemoria(StringBuilder sb, String customerMemory) {
        if (customerMemory != null && !customerMemory.isBlank()) {
            sb.append(customerMemory).append("\n");
            sb.append("<instruccion_memoria>\n");
            sb.append("Usá la memoria_cliente para personalizar tu respuesta: mencioná marcas que ya le gustan, ");
            sb.append("respetá su presupuesto estimado, y conectá lo que busca ahora con sus intereses previos. ");
            sb.append("NO digas explícitamente \"recuerdo que...\" ni menciones la memoria; simplemente adaptá tu tono.\n");
            sb.append("</instruccion_memoria>\n\n");
        }
    }

    static void appendCategorias(StringBuilder sb, List<String> categorias) {
        if (categorias != null && !categorias.isEmpty()) {
            sb.append("<categorias_de_la_tienda>\n");
            for (String cat : categorias) {
                sb.append("  <categoria>").append(PromptBuilderSupport.xmlEscape(cat)).append("</categoria>\n");
            }
            sb.append("</categorias_de_la_tienda>\n\n");
        }
    }

    static void appendCatalogo(StringBuilder sb, List<ProductoContexto> productos) {
        if (!productos.isEmpty()) {
            sb.append("<catalogo_disponible>\n");
            for (ProductoContexto p : productos) {
                sb.append("  <producto>\n");
                sb.append("    <nombre>").append(PromptBuilderSupport.xmlEscape(p.nombre())).append("</nombre>\n");
                sb.append("    <sku>").append(PromptBuilderSupport.xmlEscape(p.sku())).append("</sku>\n");
                sb.append("    <precio>₡").append(PromptBuilderSupport.PRECIO_FORMAT.format(p.precio())).append("</precio>\n");
                appendOpcional(sb, "descripcion", p.descripcionCorta());
                appendOpcional(sb, "tags", p.tags());
                appendOpcional(sb, "categoria", p.categoria());
                appendOpcional(sb, "especificaciones", p.especificaciones());
                appendOpcional(sb, "como_usar", p.comoUsar());
                if (p.stock() != null) {
                    sb.append("    <stock_disponible>").append(p.stock()).append("</stock_disponible>\n");
                }
                sb.append("  </producto>\n");
            }
            sb.append("</catalogo_disponible>\n");
        } else {
            sb.append("<catalogo_disponible>\n");
            sb.append("  <instruccion_vacio>\n");
            sb.append("    No hay productos en el catálogo para esta consulta. DEBES aplicar el paso 4\n");
            sb.append("    del comportamiento_principal en este orden:\n");
            sb.append("    1) Decir en una frase que no contamos con lo que el cliente busca.\n");
            sb.append("    2) Si hay algo en categorias_de_la_tienda que pueda interesarle, mostrarlo con [CATS:].\n");
            sb.append("    3) NUNCA mencionar productos ni categorías de tu conocimiento general entrenado.\n");
            sb.append("    La ausencia de resultados aquí confirma que la tienda NO tiene ese producto.\n");
            sb.append("  </instruccion_vacio>\n");
            sb.append("</catalogo_disponible>\n");
        }
    }

    private static void appendOpcional(StringBuilder sb, String tag, String valor) {
        if (valor == null || valor.isBlank()) return;
        sb.append("    <").append(tag).append(">")
            .append(PromptBuilderSupport.xmlEscape(valor))
            .append("</").append(tag).append(">\n");
    }
}
