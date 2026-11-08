package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Clock;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PostgreSQL de verdad: V235 no inserta el fixture, y un error de SQL aborta la transacción.
 * H2 deja seguir después del error; por eso este test no corre ahí.
 * Opt-in: {@code HC_PG_TEST_URL=jdbc:postgresql://127.0.0.1:5432/db?user=…}.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("Excepción QA PYME TEST en PostgreSQL: migración vacía y transacción abortada")
class QaAltaPymeTestPostgresTest {

    private static final String SCHEMA = "hc_qa_alta_pyme_test";
    private static final String FIJO = QaAltaPymeTestService.CORREO_FIXTURE;

    private JdbcTemplate jdbc;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() throws Exception {
        String base = System.getenv("HC_PG_TEST_URL");
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(base));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        DriverManagerDataSource ds = new DriverManagerDataSource(
            base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        jdbc = new JdbcTemplate(ds);
        tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V235__qa_alta_pyme_test.sql"));
        jdbc.execute((Connection c) -> {
            try (Statement st = c.createStatement()) {
                st.execute(sql);
            }
            return null;
        });
    }

    @AfterEach
    void tearDown() {
        new JdbcTemplate(new DriverManagerDataSource(System.getenv("HC_PG_TEST_URL")))
            .execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    @Test
    @DisplayName("V235 deja la tabla vacía: el correo del fixture no está en la base")
    void migracionNoSiembra() {
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb", Integer.class)).isZero();
        Integer conCorreo = jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb WHERE correo_normalizado = ?", Integer.class, FIJO);
        assertThat(conCorreo).isZero();
    }

    @Test
    @DisplayName("Tragar el error y seguir choca con la transacción abortada; el servicio no sigue")
    void errorAbortaYElServicioNoSigue() {
        jdbc.execute("CREATE OR REPLACE FUNCTION qa_alta_fallar() RETURNS trigger AS $$ BEGIN "
            + "RAISE EXCEPTION 'qa_alta_forzada'; END $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER qa_alta_no_escribir BEFORE INSERT OR UPDATE ON hot_click_qa_alta_pyme_test_tb "
            + "FOR EACH ROW EXECUTE FUNCTION qa_alta_fallar()");

        assertThatThrownBy(() -> tx.executeWithoutResult(st -> {
            try {
                jdbc.update("INSERT INTO hot_click_qa_alta_pyme_test_tb "
                    + "(id, correo_normalizado, plan_destino, estado, vence_en) VALUES (1, ?, 'PYME', 'DISPONIBLE', ?)",
                    FIJO, java.sql.Timestamp.valueOf(QaAltaPymeTestService.VENCE));
            } catch (DataAccessException ignorado) {
                jdbc.queryForObject("SELECT 1", Integer.class);
            }
        })).isInstanceOf(DataAccessException.class);

        QaAltaPymeTestService s = new QaAltaPymeTestService(jdbc, envTest(), true,
            "onvo_test_ficticia", "pk_test_ficticia",
            Clock.fixed(Instant.parse("2026-11-08T18:00:00Z"), Constants.ZONA_CR));
        assertThatThrownBy(() -> tx.executeWithoutResult(st -> {
            s.consumirSiAplica(FIJO);
            jdbc.queryForObject("SELECT 1", Integer.class);
        })).isInstanceOf(IllegalStateException.class).hasMessage("No se pudo aplicar la excepción QA");

        Integer filas = tx.execute(st -> jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb", Integer.class));
        assertThat(filas).isZero();
        Empresa otra = new Empresa();
        otra.setId(99L);
        otra.setCorreoEmpresa(FIJO);
        assertThat(s.empresaConCobroPymeTest(otra)).isFalse();
    }

    private static MockEnvironment envTest() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");
        return env;
    }
}
