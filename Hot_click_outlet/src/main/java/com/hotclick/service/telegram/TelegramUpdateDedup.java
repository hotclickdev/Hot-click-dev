package com.hotclick.service.telegram;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Telegram reintenta el mismo update_id si el webhook tarda.
 * Sin esto, confirmar una venta o repetir una cantidad se ejecuta dos veces.
 */
@Component
public class TelegramUpdateDedup {

    private static final long TTL_MS = 15L * 60L * 1000L;
    private final ConcurrentHashMap<Long, Long> vistos = new ConcurrentHashMap<>();

    /** true solo la primera vez que llega ese update_id. */
    public boolean esNuevo(long updateId) {
        long ahora = System.currentTimeMillis();
        if (vistos.size() > 2_000) purgar(ahora);
        return vistos.putIfAbsent(updateId, ahora) == null;
    }

    private void purgar(long ahora) {
        vistos.entrySet().removeIf(e -> ahora - e.getValue() > TTL_MS);
    }
}
