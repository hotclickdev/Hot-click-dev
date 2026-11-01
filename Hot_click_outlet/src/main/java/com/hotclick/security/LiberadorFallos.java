package com.hotclick.security;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
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
 * Nunca propaga errores: si falla, los buckets vencen solos (ventana de 30 min) y suma {@link #METRICA_FALLOS}.
 */
@Component
public class LiberadorFallos {

    private static final Logger log = LoggerFactory.getLogger(LiberadorFallos.class);

    private final RateLimiter rateLimiter;
    private final TransactionTemplate txNueva;
    private final Counter fallos;

    /** Limpiezas de contadores de fallos que no se pudieron completar (BD caída, SQL fallido). */
    public static final String METRICA_FALLOS = "hotclick.ratelimit.liberar.fallos";

    public LiberadorFallos(RateLimiter rateLimiter, PlatformTransactionManager txManager, MeterRegistry registry) {
        this.rateLimiter = rateLimiter;
        this.fallos = Counter.builder(METRICA_FALLOS)
            .description("Limpiezas de contadores de fallos de login que fallaron (los buckets vencen solos)")
            .register(registry);
        this.txNueva = new TransactionTemplate(txManager);
        this.txNueva.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Desbloqueo de cuenta: borra el bucket global y todos los de IP del usuario ({@link ClavesFallos#liberarTodo}). */
    public void liberar(Long usuarioId) {
        if (usuarioId == null) return;
        trasCommit(() -> ClavesFallos.liberarTodo(rateLimiter, usuarioId));
    }

    /**
     * Autenticación completa desde {@code ip}: borra el bucket global y el de esa IP (los de otras IP no se tocan).
     * Mismo manejo que {@link #liberar}: tras el commit, en transacción nueva y sin propagar errores.
     */
    public void liberarGlobalEIp(Long usuarioId, String ip) {
        if (usuarioId == null) return;
        trasCommit(() -> {
            rateLimiter.liberar(ClavesFallos.claveGlobal(usuarioId));
            rateLimiter.liberar(ClavesFallos.claveIp(usuarioId, ip));
        });
    }

    /** Solo el bucket global (sin IP conocida). */
    public void liberarGlobal(Long usuarioId) {
        if (usuarioId == null) return;
        trasCommit(() -> rateLimiter.liberar(ClavesFallos.claveGlobal(usuarioId)));
    }

    private void trasCommit(Runnable limpieza) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { ejecutar(limpieza); }
            });
        } else {
            ejecutar(limpieza);
        }
    }

    private void ejecutar(Runnable limpieza) {
        try {
            txNueva.executeWithoutResult(s -> limpieza.run());
        } catch (Exception e) {
            fallos.increment();
            log.warn("[RATE-LIMIT] no se pudieron limpiar los contadores: {}", e.getClass().getName());
        }
    }
}
