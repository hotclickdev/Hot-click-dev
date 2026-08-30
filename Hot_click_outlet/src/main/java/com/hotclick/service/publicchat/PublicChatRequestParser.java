package com.hotclick.service.publicchat;

import com.hotclick.dto.PublicChatRequest;
import com.hotclick.utils.ChatContextoPermitido;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Normaliza el body del chat público. El id de producto no se toma del
 * string de contexto: eso lo puede falsificar el cliente.
 */
public final class PublicChatRequestParser {

    public static final int MAX_MSG_CHARS = 500;
    static final int MAX_HISTORY = 12;
    static final int MAX_FOCUS_IDS = 5;
    static final int MAX_OFFSET = 10_000;

    private static final Set<String> ROLES_PERMITIDOS = Set.of("user", "assistant", "bot");

    private PublicChatRequestParser() {}

    public static String mensaje(PublicChatRequest req) {
        String raw = req == null || req.getMessage() == null ? "" : req.getMessage().trim();
        if (raw.length() <= MAX_MSG_CHARS) return raw;
        return raw.substring(0, MAX_MSG_CHARS);
    }

    public static int offset(PublicChatRequest req) {
        int raw = req != null && req.getOffset() != null ? req.getOffset() : 0;
        return Math.max(0, Math.min(raw, MAX_OFFSET));
    }

    public static String contexto(PublicChatRequest req) {
        return ChatContextoPermitido.normalizar(req == null ? null : req.getContext());
    }

    public static Long productoId(PublicChatRequest req) {
        return productoId(req == null ? null : req.getProductoId());
    }

    public static Long productoId(Long raw) {
        return raw != null && raw > 0 ? raw : null;
    }

    /** Conservado para tests del parser de Map. */
    public static Long productoId(Map<String, Object> body) {
        if (body == null) return null;
        Object raw = body.get("productoId");
        if (!(raw instanceof Number n)) return null;
        return productoId(n.longValue());
    }

    public static List<Long> focusIds(PublicChatRequest req) {
        if (req == null || req.getFocusIds() == null) return List.of();
        return req.getFocusIds().stream()
            .filter(id -> id != null && id > 0)
            .limit(MAX_FOCUS_IDS)
            .toList();
    }

    /**
     * Solo roles user/assistant/bot, texto recortado. Roles inventados se descartan.
     */
    public static List<Map<String, Object>> history(PublicChatRequest req) {
        if (req == null || req.getHistory() == null) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (PublicChatRequest.HistoryItem item : req.getHistory()) {
            Map<String, Object> limpio = historyItem(item);
            if (limpio == null) continue;
            out.add(limpio);
            if (out.size() >= MAX_HISTORY) break;
        }
        return List.copyOf(out);
    }

    private static Map<String, Object> historyItem(PublicChatRequest.HistoryItem item) {
        if (item == null) return null;
        String rol = item.getRol() == null ? "" : item.getRol().trim().toLowerCase();
        if (!ROLES_PERMITIDOS.contains(rol)) return null;
        String texto = item.getTexto() == null ? "" : item.getTexto().trim();
        if (texto.isBlank()) return null;
        if (texto.length() > MAX_MSG_CHARS) texto = texto.substring(0, MAX_MSG_CHARS);
        return Map.of("rol", rol, "texto", texto);
    }
}
