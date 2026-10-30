package com.hotclick.scheduler;

import com.hotclick.security.RateLimiter;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Limpieza frecuente de hot_click_rate_limit_tb. Las llaves por usuario+IP (2fa:login, fallos de autenticación)
 * crean una fila por cada IP distinta; el borrado nocturno de DataRetentionScheduler las dejaba acumularse hasta
 * 24 h. Acá se borran las vencidas ({@code expires_at < ahora}) cada 5 minutos (una ruta inválida abre una fila por IP; así la tabla no crece hasta la madrugada), en lotes de 1000 con tope de
 * lotes por corrida, con ShedLock para que lo corra un solo pod.
 */
@Component
public class RateLimitLimpiezaScheduler {

    private static final Logger log = LoggerFactory.getLogger(RateLimitLimpiezaScheduler.class);
    static final int LOTE = 1000;
    static final int MAX_LOTES = 100;

    private final RateLimiter rateLimiter;

    public RateLimitLimpiezaScheduler(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Scheduled(fixedDelay = 300_000, initialDelay = 120_000)
    @SchedulerLock(name = "rate_limit_limpieza", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void limpiarProgramado() {
        try {
            int n = limpiar();
            if (n > 0) log.info("[rate-limit-limpieza] {} bucket(s) vencido(s) borrado(s)", n);
        } catch (Exception e) {
            log.warn("[rate-limit-limpieza] no se pudo limpiar: {}", e.getClass().getName());
        }
    }

    /** Borra por lotes los buckets vencidos. Devuelve cuántos borró. */
    public int limpiar() {
        return rateLimiter.limpiarExpirados(LOTE, MAX_LOTES);
    }
}
