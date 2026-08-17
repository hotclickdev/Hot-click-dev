package com.hotclick.service.customermemory;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

/**
 * Memoria persistente de un visitante anónimo, lista para inyectar en el system prompt.
 */
public record CustomerMemoryDto(
    String       visitorId,
    String       summary,
    List<String> interests,
    List<String> preferredBrands,
    Long         estimatedBudget
) {
    public static CustomerMemoryDto empty(String visitorId) {
        return new CustomerMemoryDto(visitorId, null, List.of(), List.of(), null);
    }

    public boolean hasContent() {
        return (summary != null && !summary.isBlank())
            || !interests.isEmpty()
            || !preferredBrands.isEmpty()
            || estimatedBudget != null;
    }

    /** Formatea la memoria como bloque XML para inyectar en el system prompt. */
    public String toXmlBlock() {
        if (!hasContent()) return "";
        StringBuilder sb = new StringBuilder("<memoria_cliente>\n");
        if (summary != null && !summary.isBlank())
            sb.append("  <resumen>").append(CustomerMemoryHelpers.xmlEscape(summary)).append("</resumen>\n");
        if (!interests.isEmpty())
            sb.append("  <intereses>").append(CustomerMemoryHelpers.xmlEscape(String.join(", ", interests))).append("</intereses>\n");
        if (!preferredBrands.isEmpty())
            sb.append("  <marcas_preferidas>").append(CustomerMemoryHelpers.xmlEscape(String.join(", ", preferredBrands))).append("</marcas_preferidas>\n");
        if (estimatedBudget != null && estimatedBudget > 0) {
            NumberFormat fmt = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));
            sb.append("  <presupuesto_estimado>₡").append(fmt.format(estimatedBudget)).append("</presupuesto_estimado>\n");
        }
        sb.append("</memoria_cliente>\n");
        return sb.toString();
    }
}
