package com.hotclick.rag.pipeline;

import com.hotclick.rag.dto.ProductoContexto;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Helpers puros del pipeline RAG.
 * Extraído bit-idéntico de RagPipeline — no cambia comportamiento.
 */
final class RagPipelineSupport {

    static final Pattern CATS_TAG  = Pattern.compile("\\[CATS:([^\\]]+)\\]");
    static final Pattern OPTS_TAG  = Pattern.compile("\\[OPTS:([^\\]]+)\\]");
    static final Pattern PRODS_TAG = Pattern.compile("\\[PRODS:([^\\]]+)\\]");

    private RagPipelineSupport() {}

    /**
     * Construye el array de mensajes para Claude combinando historial + query actual.
     * Aplica deduplicación de roles consecutivos (Claude requiere alternancia user/assistant).
     */
    static List<Map<String, Object>> buildMessages(
            List<Map<String, Object>> historial, String query) {

        List<Map<String, Object>> messages = new ArrayList<>();
        String lastRole = null;

        for (Map<String, Object> m : historial) {
            String role    = String.valueOf(m.getOrDefault("role", "")).trim();
            String content = String.valueOf(m.getOrDefault("content", "")).trim();
            if (role.isBlank() || content.isBlank()) continue;
            if (role.equals(lastRole)) continue; // evitar roles consecutivos iguales
            messages.add(Map.of("role", role, "content", content));
            lastRole = role;
        }

        // Claude API exige que el primer mensaje sea "user". Si el historial truncado
        // empieza con "assistant" (ocurre cuando hay más de HISTORY_MESSAGES/2 turnos),
        // se descartan mensajes del inicio hasta encontrar el primer "user".
        while (!messages.isEmpty() && "assistant".equals(messages.get(0).get("role"))) {
            messages.remove(0);
        }

        // La query actual siempre es el último turno de user
        if ("user".equals(lastRole) && !messages.isEmpty()) {
            messages.remove(messages.size() - 1); // evita duplicar si ya hay un user al final
        }
        messages.add(Map.of("role", "user", "content", query));
        return messages;
    }

    static RagResult mockResponse(List<ProductoContexto> productos, List<String> categorias, String query) {
        String texto = productos.isEmpty()
            ? "*(modo desarrollo)* No encontré productos específicos para tu consulta. ¿Podés describir con más detalle lo que buscás?"
            : "*(modo desarrollo)* Encontré " + productos.size() + " producto(s) relevante(s) para \"" + query + "\". Configurá ANTHROPIC_API_KEY para respuestas reales.";
        return new RagResult(texto, productos, List.of(), List.of(), 0, 0);
    }

    static RagResult parseClaudeText(String texto, List<ProductoContexto> productos, int tokIn, int tokOut) {
        // Extraer [CATS:...] del texto
        List<String> categoriasSugeridas = List.of();
        Matcher mc = CATS_TAG.matcher(texto);
        if (mc.find()) {
            categoriasSugeridas = Arrays.stream(mc.group(1).split(","))
                .map(String::trim).filter(s -> !s.isBlank()).limit(5)
                .collect(Collectors.toList());
            texto = texto.replace(mc.group(0), "").strip();
        }

        // Extraer [OPTS:...]
        List<String> opts = List.of();
        Matcher mo = OPTS_TAG.matcher(texto);
        if (mo.find()) {
            opts = Arrays.stream(mo.group(1).split(","))
                .map(String::trim).filter(s -> !s.isBlank()).limit(8)
                .collect(Collectors.toList());
            texto = texto.replace(mo.group(0), "").strip();
        }

        // Extraer [PRODS:sku1,sku2] — Claude decide exactamente qué productos mostrar.
        // Si no hay tag [PRODS:], no se muestran tarjetas (evita mostrar cards cuando
        // Claude está haciendo una pregunta aclaratoria o no hay match relevante).
        List<ProductoContexto> productosAMostrar = List.of();
        Matcher mp = PRODS_TAG.matcher(texto);
        if (mp.find()) {
            Set<String> skusSeleccionados = Arrays.stream(mp.group(1).split(","))
                .map(s -> s.trim().toUpperCase())
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
            productosAMostrar = productos.stream()
                .filter(p -> p.sku() != null && skusSeleccionados.contains(p.sku().toUpperCase()))
                .collect(Collectors.toList());
            texto = texto.replace(mp.group(0), "").strip();
        }

        return new RagResult(texto, productosAMostrar, categoriasSugeridas, opts, tokIn, tokOut);
    }
}
