package com.hotclick.service.publicchat;

import java.util.List;
import java.util.Map;

/**
 * En el chat de descubrimiento las fichas salen a partir del 3.er mensaje del usuario.
 */
public final class PublicChatTurnos {

    public static final int TURNO_FICHAS = 3;

    private PublicChatTurnos() {}

    public static int turnoUsuario(List<Map<String, Object>> history) {
        if (history == null || history.isEmpty()) return 1;
        int previos = 0;
        for (Map<String, Object> m : history) {
            if (m != null && "user".equals(String.valueOf(m.get("rol")))) previos++;
        }
        return previos + 1;
    }

    public static boolean mostrarFichasCatalogo(List<Map<String, Object>> history) {
        return turnoUsuario(history) >= TURNO_FICHAS;
    }
}
