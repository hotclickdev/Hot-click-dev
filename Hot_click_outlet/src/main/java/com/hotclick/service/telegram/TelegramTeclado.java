package com.hotclick.service.telegram;

import com.hotclick.service.TelegramClienteBotService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Teclados reutilizables del bot: siempre se puede volver al menú. */
final class TelegramTeclado {

    static final String CB_MENU = "menu";

    private TelegramTeclado() {}

    static Map<String, Object> botonMenu() {
        return TelegramClienteBotService.boton("⬅️ Menú", CB_MENU);
    }

    static List<List<Map<String, Object>>> soloMenu() {
        return List.of(List.of(botonMenu()));
    }

    /** Agrega la fila de Menú al final (si aún no está). */
    static List<List<Map<String, Object>>> conMenu(List<List<Map<String, Object>>> teclado) {
        List<List<Map<String, Object>>> out = new ArrayList<>();
        if (teclado != null) out.addAll(teclado);
        if (!tieneMenu(out)) out.add(List.of(botonMenu()));
        return out;
    }

    static List<List<Map<String, Object>>> cancelarYMenu(String callbackCancelar) {
        return List.of(
            List.of(TelegramClienteBotService.boton("❌ Cancelar", callbackCancelar), botonMenu()));
    }

    private static boolean tieneMenu(List<List<Map<String, Object>>> teclado) {
        for (List<Map<String, Object>> fila : teclado) {
            for (Map<String, Object> b : fila) {
                if (CB_MENU.equals(String.valueOf(b.get("callback_data")))) return true;
            }
        }
        return false;
    }
}
