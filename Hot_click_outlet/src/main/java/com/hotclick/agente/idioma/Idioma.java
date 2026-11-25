package com.hotclick.agente.idioma;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * AG-39: idioma en que el bot responde (es, en, pt). La detección es una heurística barata por palabras funcionales
 * frecuentes: sin llamadas a terceros ni modelos. Ante empate o texto sin pistas ("ok", un número, un emoji) se usa
 * el idioma de los mensajes anteriores del cliente y, si tampoco hay pistas, español (idioma de Costa Rica).
 * El idioma sale SIEMPRE de este enum: el modelo nunca elige qué instrucción se agrega al prompt.
 */
public enum Idioma {
    ES, EN, PT;

    private static final Set<String> PALABRAS_EN = Set.of("the", "and", "is", "are", "you", "your", "do", "does", "how",
        "what", "where", "when", "much", "hello", "hi", "hey", "please", "thanks", "thank", "want", "can", "could",
        "have", "need", "my", "with", "this", "that", "shipping", "delivery", "buy", "order", "there", "it", "yes",
        "price", "cost", "any", "me", "would", "like", "send", "ship", "tourist", "hotel", "from", "about");
    private static final Set<String> PALABRAS_PT = Set.of("ola", "oi", "quero", "preco", "quanto", "voces", "voce",
        "obrigado", "obrigada", "preciso", "onde", "custa", "tem", "nao", "bom", "dia", "entrega", "sao", "uma",
        "isso", "muito", "tudo", "comprar", "enviar", "pode", "posso", "gostaria", "frete", "fazem");
    private static final Set<String> PALABRAS_ES = Set.of("hola", "quiero", "precio", "cuanto", "cuesta", "tienen",
        "gracias", "buenas", "buenos", "dias", "necesito", "donde", "favor", "envio", "los", "las", "por",
        "con", "que", "como", "puedo", "puede", "tiene", "hay", "si", "muy", "pura");
    private static final int MAX_TURNOS_PREVIOS = 3;

    /** @return el idioma del texto, o null si no hay pistas suficientes o hay empate. */
    public static Idioma deTexto(String texto) {
        if (texto == null || texto.isBlank()) return null;
        String plano = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT);
        String[] palabras = plano.split("[^a-z]+");
        int en = contar(palabras, PALABRAS_EN);
        int pt = contar(palabras, PALABRAS_PT);
        int es = contar(palabras, PALABRAS_ES);
        if (en > es && en > pt) return EN;
        if (pt > es && pt > en) return PT;
        if (es > en && es > pt) return ES;
        return null;
    }

    /**
     * @param actual  mensaje del cliente en este turno (puede ser null)
     * @param previos mensajes anteriores del cliente, del más reciente al más antiguo (puede ser null)
     */
    public static Idioma detectar(String actual, List<String> previos) {
        Idioma d = deTexto(actual);
        if (d != null) return d;
        if (previos != null) {
            int vistos = 0;
            for (String p : previos) {
                if (vistos++ >= MAX_TURNOS_PREVIOS) break;
                Idioma dp = deTexto(p);
                if (dp != null) return dp;
            }
        }
        return ES;
    }

    private static int contar(String[] palabras, Set<String> lista) {
        return (int) Arrays.stream(palabras).filter(lista::contains).count();
    }

    /**
     * Instrucción que se agrega al system prompt. Vacía para español: el prompt no cambia y el caché de prompt de
     * Claude se sigue aprovechando; en/pt son dos prefijos estables más.
     */
    public String instruccionPrompt() {
        return switch (this) {
            case ES -> "";
            case EN -> "IDIOMA: la persona escribe en inglés (probablemente un turista). Responda en inglés claro y "
                + "sencillo. Los datos NO cambian: precios siempre en colones (₡), sin convertir a dólares; nombres "
                + "de productos, tiendas y enlaces tal cual. Las reglas anteriores siguen vigentes.";
            case PT -> "IDIOMA: la persona escribe en portugués. Responda en portugués claro y sencillo. Los datos "
                + "NO cambian: precios siempre en colones (₡), sin convertir a otra moneda; nombres de productos, "
                + "tiendas y enlaces tal cual. Las reglas anteriores siguen vigentes.";
        };
    }
}
