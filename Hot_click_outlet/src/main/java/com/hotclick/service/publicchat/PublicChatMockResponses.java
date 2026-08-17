package com.hotclick.service.publicchat;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
class PublicChatMockResponses {

    public String generarRespuestaMock(List<Map<String, Object>> productos,
                                       List<Map<String, Object>> history,
                                       boolean isEnglish) {
        if (productos.isEmpty()) {
            return isEnglish
                ? "No options found. Can you describe what you're looking for differently?"
                : "No encontré opciones para eso. ¿Podés describirlo con otras palabras?";
        }
        String nombre = productos.get(0).get("nombre_producto").toString();
        boolean esRefinamiento = history != null && history.stream()
            .anyMatch(m -> "user".equals(m.get("rol")));
        if (isEnglish) {
            return esRefinamiento
                ? "Here are " + productos.size() + " options that might fit better, like " + nombre + ". Interested in any?"
                : "I found " + productos.size() + " options! For example " + nombre + ". Want more details?";
        }
        return esRefinamiento
            ? "Acá tenés " + productos.size() + " opciones más ajustadas. Por ejemplo: " + nombre + ". ¿Alguno te interesa?"
            : "¡Te encontré " + productos.size() + " opciones! Por ejemplo tenemos " + nombre + ". ¿Lo agregamos al carrito?";
    }

    public List<String> generateOpts(String context, List<Map<String, Object>> productos,
                                     String userMessage, boolean isEnglish, boolean afterHours) {
        if (isEnglish) {
            if (context != null && context.startsWith("CARRITO")) {
                return List.of("How long does shipping take?", "Can I pay by card?", "Any discount codes?");
            }
            boolean lowStock = productos.stream()
                .anyMatch(p -> ((Number) p.getOrDefault("stock_actual", 99)).longValue() <= 5);
            if (lowStock) return List.of("How many units left?", "How do I pay?", "Show more options");
            return List.of("Show me cheaper options", "How does shipping work?", "How do I pay?");
        }
        if (context != null && context.startsWith("CARRITO")) {
            return List.of("¿Cuánto tarda el envío?", "¿Cómo pago con SINPE?", "¿Tienen descuentos?");
        }
        if (context != null && context.startsWith("PRODUCTO:")) {
            return List.of("¿Cuánto stock queda?", "¿Tienen garantía?", "¿Cómo lo recibo?");
        }
        if (context != null && context.startsWith("PAGO_FALLO")) {
            return List.of("¿Cómo pago con SINPE?", "¿Aceptan transferencia?", "Ayuda con el pago");
        }
        boolean lowStock = productos.stream()
            .anyMatch(p -> ((Number) p.getOrDefault("stock_actual", 99)).longValue() <= 5);
        if (lowStock) {
            return List.of("¿Cuántas unidades quedan?", "¿Cuánto tarda el envío?", "¿Tienen algo parecido?");
        }
        if (afterHours) {
            return List.of("¿A qué hora abren?", "¿Cómo dejo mi pedido?", "¿Tienen algo más barato?");
        }
        return List.of("¿Tienen algo más barato?", "¿Cuánto tarda el envío?", "¿Cómo pago con SINPE?");
    }
}
