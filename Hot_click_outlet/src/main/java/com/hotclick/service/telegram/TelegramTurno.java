package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;

/**
 * Mensaje del bot que se está reescribiendo en este update, y el mensaje
 * del usuario que hay que borrar al responder. Vive solo en el hilo del webhook.
 */
public final class TelegramTurno {

    private static final ThreadLocal<TelegramTurno> ACTUAL = new ThreadLocal<>();

    private final Long chatId;
    private final TelegramVinculacion vinculacion;
    private Long panelId;
    private Long borrarId;
    private boolean dirty;

    private TelegramTurno(Long chatId, TelegramVinculacion vinculacion, Long panelId, Long borrarId) {
        this.chatId = chatId;
        this.vinculacion = vinculacion;
        this.panelId = panelId;
        this.borrarId = borrarId;
        this.dirty = panelId != null;
    }

    public static void abrir(TelegramVinculacion vinculacion, Long panelId, Long borrarId) {
        if (vinculacion == null || vinculacion.getChatId() == null) return;
        ACTUAL.set(new TelegramTurno(vinculacion.getChatId(), vinculacion, panelId, borrarId));
    }

    public static TelegramTurno actual() {
        return ACTUAL.get();
    }

    public Long chatId() { return chatId; }

    public Long panelId() { return panelId; }

    public void reemplazarPanel(Long id) {
        this.panelId = id;
        if (vinculacion != null) vinculacion.setPanelMessageId(id);
        dirty = true;
    }

    public Long tomarBorrar() {
        Long id = borrarId;
        borrarId = null;
        return id;
    }

    /** Cierra el turno y, si el panel cambió, devuelve la vinculación para persistirla. */
    public static TelegramVinculacion cerrarYTomarSiDirty() {
        TelegramTurno t = ACTUAL.get();
        ACTUAL.remove();
        if (t == null || !t.dirty || t.vinculacion == null) return null;
        return t.vinculacion;
    }
}
