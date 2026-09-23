package com.hotclick.service.telegram;

/** Decide si la respuesta reescribe el panel o manda un mensaje nuevo. */
public final class TelegramPublicacion {

    private TelegramPublicacion() {}

    public static boolean editar(Long panelId, boolean edicionOk) {
        return panelId != null && edicionOk;
    }
}
