package com.hotclick.service.publicchat;

import java.util.List;
import java.util.Map;

/**
 * Cuándo mostrar tarjetas de producto en el chat de descubrimiento.
 * Con intención de producto (términos de búsqueda) se muestran desde el primer mensaje.
 */
public final class PublicChatTurnos {

    private PublicChatTurnos() {}

    public static int turnoUsuario(List<Map<String, Object>> history) {
        if (history == null || history.isEmpty()) return 1;
        int previos = 0;
        for (Map<String, Object> m : history) {
            if (m != null && "user".equals(String.valueOf(m.get("rol")))) previos++;
        }
        return previos + 1;
    }

    /**
     * Hay intención de catálogo si el mensaje trae términos de búsqueda
     * (ya filtrados de stopwords), o si piden populares/ofertas.
     */
    public static boolean tieneIntencionProducto(boolean showAll, boolean showOffers, boolean tieneTerminos) {
        return showAll || showOffers || tieneTerminos;
    }
}
