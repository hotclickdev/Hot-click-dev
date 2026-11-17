package com.hotclick.integration;

import com.hotclick.repository.InvitacionEquipoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Dos aceptaciones SIMULTÁNEAS del mismo token en PostgreSQL real: exactamente una gana ({@code consumir} = 1 → 200,
 * crea la membresía) y la otra pierde ({@code consumir} = 0 → 410, no crea nada). Una sola membresía.
 *
 * <p>Ejecuta el SQL REAL de {@code InvitacionEquipoRepository.consumir} (se lee de su {@code @Query}, no se copia) y la
 * regla del servicio ({@code consumir != 1 → 410}) en dos transacciones concurrentes sobre un schema propio. Opt-in:
 * {@code HC_PG_TEST_URL=jdbc:postgresql://host:puerto/db?user=…} (lo corre el job ONVO/CI; NO apuntar al Postgres de
 * QA). El schema temporal se crea y se borra aquí. La regla {@code != 1} del servicio, sin base, la fija
 * {@code InvitacionEquipoConsumirUnitTest}.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("[PG] Aceptar la misma invitación a la vez: una gana (200), la otra 410, una sola membresía")
class InvitacionEquipoConcurrentePostgresTest {

    private static final String SCHEMA = "hc_invitacion_concurrente_test";

    private DriverManagerDataSource ds;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        String base = System.getenv("HC_PG_TEST_URL");
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(base));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        ds = new DriverManagerDataSource(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("""
            CREATE TABLE hot_click_invitacion_equipo_tb (
                id_invitacion BIGSERIAL PRIMARY KEY,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                vence_en TIMESTAMP NOT NULL,
                usado_en TIMESTAMP,
                revocado_en TIMESTAMP)
            """);
        jdbc.execute("CREATE TABLE membresia_prueba (id BIGSERIAL PRIMARY KEY, id_invitacion BIGINT NOT NULL)");
    }

    @AfterEach
    void tearDown() {
        new JdbcTemplate(new DriverManagerDataSource(System.getenv("HC_PG_TEST_URL")))
            .execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    /** El SQL nativo exacto del repositorio, con :id y :ahora pasados a parámetros posicionales (orden de aparición: ahora, id, ahora). */
    private static String sqlConsumir() throws Exception {
        Query q = InvitacionEquipoRepository.class
            .getMethod("consumir", Long.class, LocalDateTime.class).getAnnotation(Query.class);
        return q.value().replace(":id", "?").replace(":ahora", "?");
    }

    @Test
    @DisplayName("2 hilos, mismo token, misma barrera: exactamente un 200, un 410 y una membresía")
    void dosAceptacionesSimultaneas() throws Exception {
        LocalDateTime ahora = LocalDateTime.now();
        jdbc.update("INSERT INTO hot_click_invitacion_equipo_tb (token_hash, vence_en) VALUES ('h1', ?)",
            Timestamp.valueOf(ahora.plusDays(1)));
        Long id = jdbc.queryForObject("SELECT id_invitacion FROM hot_click_invitacion_equipo_tb", Long.class);
        String sql = sqlConsumir();
        TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(ds));

        int hilos = 2;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch listos = new CountDownLatch(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Integer>> resultados = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            resultados.add(pool.submit(() -> {
                listos.countDown();
                salida.await(10, TimeUnit.SECONDS);
                return tx.execute(st -> {
                    int consumidas = jdbc.update(sql, Timestamp.valueOf(ahora), id, Timestamp.valueOf(ahora));
                    if (consumidas != 1) return 410; // la misma regla que InvitacionEquipoService.consumir
                    jdbc.update("INSERT INTO membresia_prueba (id_invitacion) VALUES (?)", id);
                    return 200;
                });
            }));
        }
        assertThat(listos.await(10, TimeUnit.SECONDS)).isTrue();
        salida.countDown();
        List<Integer> estados = new ArrayList<>();
        for (Future<Integer> f : resultados) estados.add(f.get(30, TimeUnit.SECONDS));
        pool.shutdownNow();

        assertThat(estados).containsExactlyInAnyOrder(200, 410);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM membresia_prueba", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT usado_en IS NOT NULL FROM hot_click_invitacion_equipo_tb", Boolean.class)).isTrue();
    }
}
