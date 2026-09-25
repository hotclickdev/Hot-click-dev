package com.hotclick.service.publicchat;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
class PublicChatMockResponses {

    private final PublicChatAdvisorAnswers advisorAnswers;

    PublicChatMockResponses(PublicChatAdvisorAnswers advisorAnswers) {
        this.advisorAnswers = advisorAnswers;
    }

    public String generarRespuestaMock(List<Map<String, Object>> productos,
                                       List<Map<String, Object>> history,
                                       boolean isEnglish) {
        if (productos.isEmpty()) {
            return isEnglish
                ? "Tell me a bit more — what space or use is it for?"
                : "Contame un poco más: ¿para qué espacio o uso lo necesitás?";
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

    public String generarRespuestaAsesor(Map<String, Object> ficha, String mensaje, boolean isEnglish) {
        return advisorAnswers.responder(ficha, mensaje, isEnglish);
    }

    public List<String> generateAdvisorOpts(boolean isEnglish) {
        return isEnglish
            ? List.of("What is it for?", "How do I use it?", "Does it have warranty?")
            : List.of("¿Para qué sirve?", "¿Cómo se usa?", "¿Tiene garantía?");
    }

    public List<String> generateOpts(String context, List<Map<String, Object>> productos,
                                     String userMessage, boolean isEnglish, boolean afterHours) {
        if (isEnglish) {
            if (context != null && context.startsWith("CARRITO")) {
                return List.of("How long does shipping take?", "Can I pay by card?");
            }
            boolean lowStock = productos.stream()
                .anyMatch(p -> ((Number) p.getOrDefault("stock_actual", 99)).longValue() <= 5);
            if (lowStock) return List.of("How do I pay?", "Show more options");
            return List.of("How does shipping work?", "How do I pay?");
        }
        if (context != null && context.startsWith("CARRITO")) {
            return List.of("¿Cuánto tarda el envío?", "¿Cómo pago con SINPE?");
        }
        if (context != null && context.startsWith("PRODUCTO:")) {
            return List.of("¿Tienen garantía?", "¿Cómo lo recibo?");
        }
        if (context != null && context.startsWith("PAGO_FALLO")) {
            return List.of("¿Cómo pago con SINPE?", "Ayuda con el pago");
        }
        boolean lowStock = productos.stream()
            .anyMatch(p -> ((Number) p.getOrDefault("stock_actual", 99)).longValue() <= 5);
        if (lowStock) {
            return List.of("¿Cuánto tarda el envío?", "¿Tienen algo parecido?");
        }
        if (afterHours) {
            return List.of("¿A qué hora abren?", "¿Cómo dejo mi pedido?");
        }
        return List.of("¿Cuánto tarda el envío?", "¿Cómo pago con SINPE?");
    }
}
