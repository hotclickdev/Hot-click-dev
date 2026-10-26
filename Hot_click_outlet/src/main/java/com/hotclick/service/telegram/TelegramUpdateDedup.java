package com.hotclick.service.telegram;

import com.hotclick.repository.TelegramUpdateProcesadoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Telegram reintenta el mismo update_id si el webhook tarda.
 * Sin esto, confirmar una venta o repetir una cantidad se ejecuta dos veces.
 *
 * <p>TG3: capa 1 en memoria (rápida); capa 2 persistente con INSERT atómico en una transacción
 * propia (REQUIRES_NEW), ANTES de procesar. Duplicado → no se procesa. Falla de BD → fail-closed:
 * no se procesa (el webhook igual responde 200 para que Telegram no reintente en bucle).
 */
@Component
public class TelegramUpdateDedup {

    private static final Logger log = LoggerFactory.getLogger(TelegramUpdateDedup.class);
    private static final long TTL_MS = 15L * 60L * 1000L;
    private final ConcurrentHashMap<Long, Long> vistos = new ConcurrentHashMap<>();
    private final TelegramUpdateProcesadoRepository repo;
    private final TransactionTemplate tx;

    public TelegramUpdateDedup(TelegramUpdateProcesadoRepository repo, PlatformTransactionManager txManager) {
        this.repo = repo;
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** true solo la primera vez que llega ese update_id (y quedó marcado en BD). */
    public boolean esNuevo(long updateId) {
        long ahora = System.currentTimeMillis();
        if (vistos.size() > 2_000) purgar(ahora);
        if (vistos.putIfAbsent(updateId, ahora) != null) return false;
        try {
            tx.executeWithoutResult(s -> repo.insertar(updateId, LocalDateTime.now(Constants.ZONA_CR)));
            return true;
        } catch (DataIntegrityViolationException dup) {
            return false;
        } catch (RuntimeException e) {
            log.error("[telegram-dedup] no se pudo marcar update {}; se descarta (fail-closed): {}",
                updateId, e.getClass().getName());
            return false;
        }
    }

    private void purgar(long ahora) {
        vistos.entrySet().removeIf(e -> ahora - e.getValue() > TTL_MS);
    }
}
