package com.hotclick.security;

import com.hotclick.integration.BaseIntegrationTest;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;

/**
 * Seguimiento de #414 (LOWs de Seguridad): la limpieza de contadores corre tras el commit y en transacción aparte
 * (un SQL fallido no aborta el desbloqueo), y el borrado por prefijo no se pasa de largo con %, _, \ ni entre ids (1 vs 10).
 */
@DisplayName("[RateLimiter] limpieza de contadores: afterCommit + tx nueva; prefijo con comodines e ids 1 vs 10")
class LiberadorFallosIntegrationTest extends BaseIntegrationTest {

    @Autowired private LiberadorFallos liberador;
    @MockitoSpyBean private RateLimiter rateLimiter;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private EntityManagerFactory emf;

    private boolean existe(String key) {
        Integer n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_rate_limit_tb WHERE bucket_key = ?", Integer.class, key);
        return n != null && n > 0;
    }

    private void sembrar(String... keys) {
        for (String k : keys) rateLimiter.registrar(k, 600);
    }

    // ── afterCommit + transacción nueva ─────────────────────────────────────────────

    @Test
    @DisplayName("Con transacción activa la limpieza espera al commit: dentro de la tx el bucket sigue, después ya no")
    void limpiaDespuesDelCommit() {
        String global = ClavesFallos.claveGlobal(42L);
        sembrar(global, ClavesFallos.claveIp(42L, "203.0.113.5"));

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            liberador.liberar(42L);
            assertThat(existe(global)).as("todavía no: la tx no se ha confirmado").isTrue();
        });

        assertThat(existe(global)).isFalse();
        assertThat(existe(ClavesFallos.claveIp(42L, "203.0.113.5"))).isFalse();
    }

    @Test
    @DisplayName("Si el desbloqueo se revierte, los contadores se conservan (sigue bloqueada, sigue contando)")
    void rollbackConservaContadores() {
        String global = ClavesFallos.claveGlobal(43L);
        sembrar(global);

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            liberador.liberar(43L);
            s.setRollbackOnly();
        });

        assertThat(existe(global)).isTrue();
    }

    @Test
    @DisplayName("La limpieza corre en una transacción NUEVA (otro EntityManager/conexión que la del desbloqueo)")
    void correEnTransaccionAparte() {
        sembrar(ClavesFallos.claveGlobal(44L));
        AtomicReference<Object> deLaLimpieza = new AtomicReference<>();
        doAnswer(inv -> {
            deLaLimpieza.set(TransactionSynchronizationManager.getResource(emf));
            return inv.callRealMethod();
        }).when(rateLimiter).liberar(anyString());
        AtomicReference<Object> delDesbloqueo = new AtomicReference<>();

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            delDesbloqueo.set(TransactionSynchronizationManager.getResource(emf));
            liberador.liberar(44L);
        });

        assertThat(deLaLimpieza.get()).as("la limpieza tuvo su propio recurso transaccional").isNotNull();
        assertThat(deLaLimpieza.get()).isNotSameAs(delDesbloqueo.get());
    }

    @Test
    @DisplayName("Si la limpieza falla, el desbloqueo ya confirmado no se ve afectado y no se propaga la excepción")
    void fallaDeLaLimpiezaNoRompeElDesbloqueo() {
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("caida")).when(rateLimiter).liberar(anyString());
        String antes = usuarioRepository.findById(testUser.getId()).orElseThrow().getNombre();

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            var u = usuarioRepository.findById(testUser.getId()).orElseThrow();
            u.setNombre("Desbloqueado");
            usuarioRepository.save(u);
            liberador.liberar(testUser.getId());
        });

        assertThat(usuarioRepository.findById(testUser.getId()).orElseThrow().getNombre()).isEqualTo("Desbloqueado").isNotEqualTo(antes);
    }

    // ── patrón de liberarPrefijo ────────────────────────────────────────────────────

    @Test
    @DisplayName("liberarPrefijo: '%' del prefijo es literal, no comodín")
    void porcentajeEsLiteral() {
        sembrar("t:50%:a", "t:50x:a", "t:5099:a");
        rateLimiter.liberarPrefijo("t:50%:");
        assertThat(existe("t:50%:a")).isFalse();
        assertThat(existe("t:50x:a")).isTrue();
        assertThat(existe("t:5099:a")).isTrue();
    }

    @Test
    @DisplayName("liberarPrefijo: '_' del prefijo es literal, no 'cualquier carácter'")
    void guionBajoEsLiteral() {
        sembrar("t:a_b:1", "t:aXb:1");
        rateLimiter.liberarPrefijo("t:a_b:");
        assertThat(existe("t:a_b:1")).isFalse();
        assertThat(existe("t:aXb:1")).isTrue();
    }

    @Test
    @DisplayName("liberarPrefijo: '\\' del prefijo es literal y no escapa al carácter siguiente")
    void barraInversaEsLiteral() {
        sembrar("t:a\\b:1", "t:aXb:1", "t:a\\\\b:1");
        rateLimiter.liberarPrefijo("t:a\\b:");
        assertThat(existe("t:a\\b:1")).isFalse();
        assertThat(existe("t:aXb:1")).isTrue();
        assertThat(existe("t:a\\\\b:1")).isTrue();
    }

    @Test
    @DisplayName("liberarTodo del usuario 1 no borra los buckets del 10 (ni al revés, ni del 100)")
    void idUnoNoBorraDiez() {
        for (long id : new long[]{1L, 10L, 100L}) sembrar(ClavesFallos.claveGlobal(id), ClavesFallos.claveIp(id, "203.0.113.5"));

        ClavesFallos.liberarTodo(rateLimiter, 1L);
        assertThat(existe(ClavesFallos.claveGlobal(1L))).isFalse();
        assertThat(existe(ClavesFallos.claveIp(1L, "203.0.113.5"))).isFalse();
        for (long id : new long[]{10L, 100L}) {
            assertThat(existe(ClavesFallos.claveGlobal(id))).as("global " + id).isTrue();
            assertThat(existe(ClavesFallos.claveIp(id, "203.0.113.5"))).as("ip " + id).isTrue();
        }

        ClavesFallos.liberarTodo(rateLimiter, 10L);
        assertThat(existe(ClavesFallos.claveGlobal(10L))).isFalse();
        assertThat(existe(ClavesFallos.claveGlobal(100L))).isTrue();
        assertThat(existe(ClavesFallos.claveIp(100L, "203.0.113.5"))).isTrue();
    }

    @Autowired private io.micrometer.core.instrument.MeterRegistry meterRegistry;

    private double fallosMetrica() {
        var c = meterRegistry.find(LiberadorFallos.METRICA_FALLOS).counter();
        return c == null ? 0 : c.count();
    }

    @Test
    void limpiezaFallidaSumaLaMetrica() {
        double antes = fallosMetrica();
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("caida")).when(rateLimiter).liberar(anyString());
        liberador.liberarGlobal(testUser.getId());
        assertThat(fallosMetrica()).isEqualTo(antes + 1);
        liberador.liberarGlobalEIp(testUser.getId(), "203.0.113.9");
        assertThat(fallosMetrica()).isEqualTo(antes + 2);
    }

    @Test
    void limpiezaExitosaNoSumaLaMetrica() {
        double antes = fallosMetrica();
        liberador.liberarGlobal(testUser.getId());
        assertThat(fallosMetrica()).isEqualTo(antes);
    }
}
