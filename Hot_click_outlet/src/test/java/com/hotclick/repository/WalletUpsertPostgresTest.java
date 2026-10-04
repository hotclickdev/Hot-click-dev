package com.hotclick.repository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * QA-B02-5 con semántica real de PostgreSQL: el viejo {@code WalletRepository.upsertAcreditar} fallaba con
 * {@code column reference "saldo_disponible" is ambiguous} en el {@code ON CONFLICT … DO UPDATE}.
 * Ahora son {@code crearSiNoExiste} + {@code sumarAcreditado}; este test corre esas SQL tal cual.
 *
 * <p>H2 (la BD de la suite) no ejecuta {@code ON CONFLICT}, así que este test corre solo con un
 * PostgreSQL de verdad: {@code HC_PG_TEST_URL=jdbc:postgresql://127.0.0.1:55432/db?user=…}.
 * Usa un schema temporal propio y lo borra al terminar. Testcontainers no está disponible offline
 * (no hay Docker en el box), por eso es opt-in.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("[QA-B02-5] WalletRepository: acreditación en PostgreSQL")
class WalletUpsertPostgresTest {

    private static final String SCHEMA = "hc_wallet_upsert_test";

    private SingleConnectionDataSource ds;
    private NamedParameterJdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        ds = new SingleConnectionDataSource(System.getenv("HC_PG_TEST_URL"), true);
        jdbc = new NamedParameterJdbcTemplate(ds);
        jdbc.getJdbcTemplate().execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        jdbc.getJdbcTemplate().execute("CREATE SCHEMA " + SCHEMA);
        jdbc.getJdbcTemplate().execute("SET search_path TO " + SCHEMA);
        // Mismas columnas que V80__wallet_agregador.sql (sin la FK a empresa).
        jdbc.getJdbcTemplate().execute("""
            CREATE TABLE hot_click_wallet_tb (
                fk_id_empresa        BIGINT    NOT NULL PRIMARY KEY,
                saldo_disponible     BIGINT    NOT NULL DEFAULT 0,
                saldo_retenido       BIGINT    NOT NULL DEFAULT 0,
                total_acreditado     BIGINT    NOT NULL DEFAULT 0,
                total_retirado       BIGINT    NOT NULL DEFAULT 0,
                ultima_actualizacion TIMESTAMP NOT NULL DEFAULT NOW())
            """);
    }

    @AfterEach
    void tearDown() {
        jdbc.getJdbcTemplate().execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        ds.destroy();
    }

    @Test
    @DisplayName("Crea la billetera y después suma sobre la fila existente (sin 'ambiguous')")
    void acreditar_creaYSuma() throws Exception {
        acreditar(8L, 16289L);
        acreditar(8L, 1000L);
        acreditar(9L, 500L);

        Map<String, Object> w8 = jdbc.getJdbcTemplate()
            .queryForMap("SELECT saldo_disponible, total_acreditado, saldo_retenido FROM hot_click_wallet_tb WHERE fk_id_empresa = 8");
        assertThat(((Number) w8.get("saldo_disponible")).longValue()).isEqualTo(17289L);
        assertThat(((Number) w8.get("total_acreditado")).longValue()).isEqualTo(17289L);
        assertThat(((Number) w8.get("saldo_retenido")).longValue()).isZero();
        assertThat(jdbc.getJdbcTemplate().queryForObject(
            "SELECT saldo_disponible FROM hot_click_wallet_tb WHERE fk_id_empresa = 9", Long.class)).isEqualTo(500L);
    }

    @Test
    @DisplayName("crearSiNoExiste sobre una billetera existente no aborta la transacción (ON CONFLICT DO NOTHING)")
    void crearSiNoExiste_enTransaccion_noAborta() throws Exception {
        java.sql.Connection c = ds.getConnection();
        c.setAutoCommit(false);
        try {
            acreditar(8L, 100L);
            acreditar(8L, 50L); // segundo INSERT choca y no hace nada; el UPDATE sigue andando
            assertThat(jdbc.getJdbcTemplate().queryForObject(
                "SELECT saldo_disponible FROM hot_click_wallet_tb WHERE fk_id_empresa = 8", Long.class)).isEqualTo(150L);
        } finally {
            c.rollback();
            c.setAutoCommit(true);
        }
    }

    private void acreditar(Long empresaId, Long monto) throws Exception {
        String crear = WalletRepository.class.getMethod("crearSiNoExiste", Long.class).getAnnotation(Query.class).value();
        String sumar = WalletRepository.class.getMethod("sumarAcreditado", Long.class, Long.class)
            .getAnnotation(Query.class).value();
        MapSqlParameterSource params = new MapSqlParameterSource(Map.of("empresaId", empresaId, "monto", monto));
        jdbc.update(crear, params);
        assertThat(jdbc.update(sumar, params)).isEqualTo(1);
    }
}
