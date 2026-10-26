package com.hotclick.repository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * R-2 con semántica real de PostgreSQL: dos transacciones concurrentes reservan la misma clave de cobro con
 * {@link StripeEventoReserva#SQL_RESERVA_PG}. Solo una inserta (1); la otra espera el commit y recibe 0.
 *
 * <p>H2 (la BD de la suite) no ejecuta ON CONFLICT y no hay Docker en el box para Testcontainers, así que el
 * test es opt-in como WalletUpsertPostgresTest: {@code HC_PG_TEST_URL=jdbc:postgresql://…?user=…}.
 * Usa un schema temporal propio y lo borra al terminar.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("[R-2] Reserva atómica de la clave de cobro ONVO en PostgreSQL")
class StripeEventoReservaPostgresTest {

    private static final String SCHEMA = "hc_onvo_reserva_test";
    private static final String URL = System.getenv("HC_PG_TEST_URL");

    private Connection conectar() throws Exception {
        Connection c = DriverManager.getConnection(URL);
        try (Statement st = c.createStatement()) { st.execute("SET search_path TO " + SCHEMA); }
        return c;
    }

    @BeforeEach
    void setUp() throws Exception {
        try (Connection c = DriverManager.getConnection(URL); Statement st = c.createStatement()) {
            st.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
            st.execute("CREATE SCHEMA " + SCHEMA);
            // Mismas columnas que la entidad StripeEvento.
            st.execute("""
                CREATE TABLE %s.hot_click_stripe_evento_tb (
                    stripe_event_id VARCHAR(100) PRIMARY KEY,
                    tipo            VARCHAR(100),
                    procesado_ok    BOOLEAN   NOT NULL DEFAULT FALSE,
                    fecha_recibido  TIMESTAMP NOT NULL,
                    fecha_procesado TIMESTAMP,
                    error           VARCHAR(255))
                """.formatted(SCHEMA));
        }
    }

    @AfterEach
    void tearDown() throws Exception {
        try (Connection c = DriverManager.getConnection(URL); Statement st = c.createStatement()) {
            st.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }

    /** La SQL de producción (StripeEventoReserva.SQL_RESERVA_PG). */
    private static String sql() {
        return StripeEventoReserva.SQL_RESERVA_PG;
    }

    private static int reservar(Connection c, String clave) throws Exception {
        try (PreparedStatement ps = c.prepareStatement(sql())) {
            Timestamp ahora = Timestamp.valueOf(LocalDateTime.now());
            ps.setString(1, clave);
            ps.setString(2, "onvo.cobro");
            ps.setTimestamp(3, ahora);
            ps.setTimestamp(4, ahora);
            return ps.executeUpdate();
        }
    }

    @Test
    @DisplayName("Dos tx simultáneas con la misma clave: exactamente una inserta")
    void concurrentesUnaSolaGana() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch listos = new CountDownLatch(2);
        CountDownLatch largar = new CountDownLatch(1);
        try {
            Future<Integer> a = pool.submit(() -> enTx(listos, largar));
            Future<Integer> b = pool.submit(() -> enTx(listos, largar));
            listos.await(10, TimeUnit.SECONDS);
            largar.countDown();
            int total = a.get(20, TimeUnit.SECONDS) + b.get(20, TimeUnit.SECONDS);
            assertThat(total).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        try (Connection c = conectar(); Statement st = c.createStatement();
             var rs = st.executeQuery("SELECT COUNT(*) FROM hot_click_stripe_evento_tb")) {
            rs.next();
            assertThat(rs.getInt(1)).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("Si la tx que reservó revierte, la siguiente entrega puede reservar")
    void rollbackLiberaLaClave() throws Exception {
        try (Connection c = conectar()) {
            c.setAutoCommit(false);
            assertThat(reservar(c, "onvo_cobro_sub_x_inv_y")).isEqualTo(1);
            c.rollback();
        }
        try (Connection c = conectar()) {
            assertThat(reservar(c, "onvo_cobro_sub_x_inv_y")).isEqualTo(1);
            assertThat(reservar(c, "onvo_cobro_sub_x_inv_y")).isZero();
        }
    }

    private Integer enTx(CountDownLatch listos, CountDownLatch largar) throws Exception {
        try (Connection c = conectar()) {
            c.setAutoCommit(false);
            listos.countDown();
            largar.await(10, TimeUnit.SECONDS);
            int n = reservar(c, "onvo_cobro_sub_abc_inv_clinv_1");
            Thread.sleep(200); // mantiene la tx abierta: la otra espera en el índice de la PK
            c.commit();
            return n;
        }
    }
}
