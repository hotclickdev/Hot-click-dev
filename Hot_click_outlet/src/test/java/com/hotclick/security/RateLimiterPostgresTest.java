package com.hotclick.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * M1 con semántica real de PostgreSQL: N hilos cuentan fallos sobre la MISMA llave nueva, cada uno DENTRO de su
 * transacción (como {@code UsuarioService.registrarFalloAutenticacion}). Con el SELECT→INSERT anterior, los que
 * perdían la carrera chocaban con la PK, PostgreSQL abortaba su transacción ("current transaction is aborted") y el
 * fallo no se contaba. Ahora todos terminan bien y el contador es exacto.
 *
 * <p>Opt-in como {@code WalletUpsertPostgresTest}: {@code HC_PG_TEST_URL=jdbc:postgresql://127.0.0.1:55432/db?user=…}.
 * Usa un schema temporal propio y lo borra al terminar.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("[M1] RateLimiter en PostgreSQL: conteo concurrente dentro de transacciones")
class RateLimiterPostgresTest {

    private static final String SCHEMA = "hc_ratelimit_test";

    private DriverManagerDataSource ds;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        String base = System.getenv("HC_PG_TEST_URL");
        DriverManagerDataSource admin = new DriverManagerDataSource(base);
        new JdbcTemplate(admin).execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        new JdbcTemplate(admin).execute("CREATE SCHEMA " + SCHEMA);
        ds = new DriverManagerDataSource(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        jdbc = new JdbcTemplate(ds);
        // Igual que V52__rate_limit_table.sql
        jdbc.execute("""
            CREATE TABLE hot_click_rate_limit_tb (
                bucket_key   VARCHAR(200) PRIMARY KEY,
                count        INTEGER      NOT NULL DEFAULT 0,
                window_start BIGINT       NOT NULL,
                expires_at   BIGINT       NOT NULL)
            """);
    }

    @AfterEach
    void tearDown() {
        new JdbcTemplate(new DriverManagerDataSource(System.getenv("HC_PG_TEST_URL")))
            .execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    @Test
    @DisplayName("32 hilos, misma llave nueva, cada uno en su transacción: ninguna aborta y cuenta exactamente 32")
    void conteoConcurrenteDentroDeTransacciones() throws Exception {
        RateLimiter rl = new RateLimiter(jdbc);
        TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        int hilos = 32;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CyclicBarrier salida = new CyclicBarrier(hilos);
        AtomicInteger errores = new AtomicInteger();
        List<Future<Integer>> resultados = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            resultados.add(pool.submit(() -> {
                salida.await(10, TimeUnit.SECONDS);
                try {
                    return tx.execute(st -> {
                        int n = rl.registrar("auth:fallos:usuario:1:global", 1800);
                        // una segunda sentencia en la misma transacción: si el limitador la hubiera abortado, falla aquí
                        jdbc.queryForObject("SELECT 1", Integer.class);
                        return n;
                    });
                } catch (Exception e) {
                    errores.incrementAndGet();
                    return -1;
                }
            }));
        }
        List<Integer> contadores = new ArrayList<>();
        for (Future<Integer> f : resultados) contadores.add(f.get(30, TimeUnit.SECONDS));
        pool.shutdownNow();

        assertThat(errores.get()).as("transacciones abortadas").isZero();
        assertThat(contadores).as("cada hilo vio un valor distinto del 1 al 32").containsExactlyInAnyOrderElementsOf(
            java.util.stream.IntStream.rangeClosed(1, hilos).boxed().toList());
        assertThat(jdbc.queryForObject("SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key = 'auth:fallos:usuario:1:global'",
            Integer.class)).isEqualTo(hilos);
    }

    @Test
    @DisplayName("La ventana vencida se reinicia en 1 y la vigente sigue sumando")
    void ventanaVencidaReinicia() {
        RateLimiter rl = new RateLimiter(jdbc);
        assertThat(rl.registrar("k", 60)).isEqualTo(1);
        assertThat(rl.registrar("k", 60)).isEqualTo(2);
        jdbc.update("UPDATE hot_click_rate_limit_tb SET window_start = window_start - 120 WHERE bucket_key = 'k'");
        assertThat(rl.registrar("k", 60)).isEqualTo(1);
        assertThat(rl.registrar("k", 60)).isEqualTo(2);
    }
}
