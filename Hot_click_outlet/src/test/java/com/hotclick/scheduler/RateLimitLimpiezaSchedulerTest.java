package com.hotclick.scheduler;

import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.security.RateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("[Rate limit] limpieza de buckets vencidos (una fila por usuario+IP no se acumula)")
class RateLimitLimpiezaSchedulerTest extends BaseIntegrationTest {

    @Autowired private RateLimitLimpiezaScheduler scheduler;
    @Autowired private RateLimiter rateLimiter;

    private void insertar(String key, long expiraEn) {
        jdbcTemplate.update("INSERT INTO hot_click_rate_limit_tb (bucket_key, window_start, count, expires_at) VALUES (?, ?, 1, ?)",
            key, expiraEn - 60, expiraEn);
    }

    private long filas(String prefijo) {
        return jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hot_click_rate_limit_tb WHERE bucket_key LIKE ?", Long.class, prefijo + "%");
    }

    @Test
    @DisplayName("borra los vencidos (más que un lote) y deja los vigentes y los recién creados por el limitador")
    void borraVencidosYDejaVigentes() {
        long ahora = Instant.now().getEpochSecond();
        for (int i = 0; i < 2500; i++) insertar("2fa:login:usuario:1:ip:10.0." + i, ahora - 10);
        insertar("2fa:login:usuario:1:ip:vigente", ahora + 600);
        assertThat(rateLimiter.tryAcquire("auth:fallos:usuario:1:ip:9.9.9.9", 5, 1800)).isTrue();

        int borrados = scheduler.limpiar();

        assertThat(borrados).isEqualTo(2500);
        assertThat(filas("2fa:login:usuario:1:ip:10.0.")).isZero();
        assertThat(filas("2fa:login:usuario:1:ip:vigente")).isEqualTo(1);
        assertThat(filas("auth:fallos:usuario:1:ip:9.9.9.9")).isEqualTo(1);
        assertThat(scheduler.limpiar()).as("segunda pasada: nada que borrar").isZero();
    }

    @Test
    @DisplayName("alcanzoLimite no incrementa, respeta la ventana y liberar borra el bucket")
    void alcanzoLimiteYLiberar() {
        for (int i = 0; i < 3; i++) rateLimiter.registrar("k:test", 60);
        assertThat(rateLimiter.alcanzoLimite("k:test", 3, 60)).isTrue();
        assertThat(rateLimiter.alcanzoLimite("k:test", 4, 60)).isFalse();
        assertThat(rateLimiter.alcanzoLimite("k:test", 3, 60)).as("leer no suma").isTrue();
        assertThat(rateLimiter.alcanzoLimite("k:otro", 1, 60)).isFalse();
        rateLimiter.liberar("k:test");
        assertThat(rateLimiter.alcanzoLimite("k:test", 1, 60)).isFalse();
    }
}
