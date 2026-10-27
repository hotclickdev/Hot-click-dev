package com.hotclick.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Limpia los contadores de fallos de una cuenta al desbloquearla ({@link ClavesFallos#liberarTodo}) sin poder romper la
 * transacción del desbloqueo: en PostgreSQL un SQL fallido dentro de la transacción la aborta aunque se capture la excepción.
 * Si hay transacción activa, la limpieza corre DESPUÉS del commit (si el desbloqueo se revierte, los contadores se conservan)
 * y en una transacción NUEVA e independiente; sin transacción activa corre de inmediato también en una nueva.
 * Nunca propaga errores: si falla, los buckets vencen solos (ventana de 30 min).
 */
@Component
public class LiberadorFallos {

    private static final Logger log = LoggerFactory.getLogger(LiberadorFallos.class);

    private final RateLimiter rateLimiter;
    private final TransactionTemplate txNueva;

    public LiberadorFallos(RateLimiter rateLimiter, PlatformTransactionManager txManager) {
        this.rateLimiter = rateLimiter;
        this.txNueva = new TransactionTemplate(txManager);
        this.txNueva.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void liberar(Long usuarioId) {
        if (usuarioId == null) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { ejecutar(usuarioId); }
            });
        } else {
            ejecutar(usuarioId);
        }
    }

    private void ejecutar(Long usuarioId) {
        try {
            txNueva.executeWithoutResult(s -> ClavesFallos.liberarTodo(rateLimiter, usuarioId));
        } catch (Exception e) {
            log.warn("[RATE-LIMIT] no se pudieron limpiar los contadores al desbloquear: {}", e.getClass().getName());
        }
    }
}
