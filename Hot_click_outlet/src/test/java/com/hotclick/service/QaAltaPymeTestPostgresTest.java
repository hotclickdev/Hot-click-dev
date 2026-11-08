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
import java.time.Clock;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PostgreSQL efímero de CI (postgres del job, no una base persistente ni de prod).
 * H2 no aborta la transacción: este archivo acredita ese caso y el rollback aislado.
 * Sin {@code HC_PG_TEST_URL} JUnit lo omite; el job de CI lo define y
 * {@code scripts/ci/qa-alta-pg-surefire.py} falla si el reporte queda en cero o skipped.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("Excepción QA PYME TEST en PostgreSQL: migración vacía, tx abortada y rollback")
class QaAltaPymeTestPostgresTest {

    private static final String SCHEMA = "hc_qa_alta_pyme_test";
    private static final String FIJO = QaAltaPymeTestService.CORREO_FIXTURE;
    private static final Clock ANTES = Clock.fixed(Instant.parse("2026-11-08T18:00:00Z"), Constants.ZONA_CR);

    private String urlSinClave;
    private String usuario;
    private String clave;
    private JdbcTemplate jdbc;
    private JdbcTemplate otraConexion;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() throws Exception {
        separarClave(System.getenv("HC_PG_TEST_URL"));
        JdbcTemplate admin = new JdbcTemplate(fuente(urlSinClave));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        String conSchema = urlSinClave + (urlSinClave.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA;
        jdbc = new JdbcTemplate(fuente(conSchema));
        otraConexion = new JdbcTemplate(fuente(conSchema));
        tx = new TransactionTemplate(new DataSourceTransactionManager(jdbc.getDataSource()));
        ejecutarScript(jdbc, Files.readString(Path.of("src/main/resources/db/migration/V235__qa_alta_pyme_test.sql")));
    }

    @AfterEach
    void tearDown() {
        if (urlSinClave == null) return;
        new JdbcTemplate(fuente(urlSinClave)).execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    @Test
    @DisplayName("V235 deja la tabla vacía: el correo del fixture no está en la base")
    void migracionNoSiembra() {
        assertThat(contar(jdbc)).isZero();
        Integer conCorreo = jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb WHERE correo_normalizado = ?",
            Integer.class, FIJO);
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
        })).isInstanceOf(DataAccessException.class)
            .hasMessageContaining("current transaction is aborted");

        QaAltaPymeTestService s = servicio();
        assertThatThrownBy(() -> tx.executeWithoutResult(st -> {
            s.consumirSiAplica(FIJO);
            jdbc.queryForObject("SELECT 1", Integer.class);
        })).isInstanceOf(IllegalStateException.class).hasMessage("No se pudo aplicar la excepción QA");

        assertThat(contar(jdbc)).isZero();
        assertThat(s.empresaConCobroPymeTest(negocio(99L))).isFalse();
    }

    @Test
    @DisplayName("Otra conexión no ve el uso sin commit; el rollback no deja fila; el commit liga solo ese id")
    void rollbackYAislamiento() {
        QaAltaPymeTestService s = servicio();
        tx.executeWithoutResult(st -> {
            Boolean tomado = s.consumirSiAplica(FIJO);
            assertThat(tomado).isTrue();
            assertThat(contar(otraConexion)).isZero();
            st.setRollbackOnly();
        });
        assertThat(contar(otraConexion)).isZero();
        assertThat(contar(jdbc)).isZero();

        Boolean tomado = tx.execute(st -> s.consumirSiAplica(FIJO));
        assertThat(tomado).isTrue();
        assertThat(contar(otraConexion)).isEqualTo(1);
        s.vincular(42L, FIJO);
        assertThat(s.empresaConCobroPymeTest(negocio(42L))).isTrue();
        assertThat(s.empresaConCobroPymeTest(negocio(99L))).isFalse();
        assertThat(s.consumirSiAplica(FIJO)).isFalse();
        Long id = otraConexion.queryForObject(
            "SELECT empresa_id FROM hot_click_qa_alta_pyme_test_tb", Long.class);
        assertThat(id).isEqualTo(42L);
        assertThat(contar(otraConexion)).isEqualTo(1);
    }

    private QaAltaPymeTestService servicio() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");
        return new QaAltaPymeTestService(jdbc, env, true, "onvo_test_ficticia", "pk_test_ficticia", ANTES);
    }

    private static Empresa negocio(long id) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setCorreoEmpresa(FIJO);
        return e;
    }

    private static int contar(JdbcTemplate plantilla) {
        Integer n = plantilla.queryForObject("SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb", Integer.class);
        return n == null ? 0 : n;
    }

    private DriverManagerDataSource fuente(String url) {
        DriverManagerDataSource ds = new DriverManagerDataSource(url);
        ds.setUsername(usuario);
        ds.setPassword(clave);
        return ds;
    }

    /** Saca user y password del query para que un fallo de conexión no los lleve en la URL. */
    private void separarClave(String cruda) {
        int q = cruda.indexOf('?');
        String base = q < 0 ? cruda : cruda.substring(0, q);
        String query = q < 0 ? "" : cruda.substring(q + 1);
        StringBuilder resto = new StringBuilder();
        for (String par : query.split("&")) {
            if (par.isEmpty()) continue;
            int eq = par.indexOf('=');
            String nombre = eq < 0 ? par : par.substring(0, eq);
            String valor = eq < 0 ? "" : par.substring(eq + 1);
            if (nombre.equals("user")) usuario = valor;
            else if (nombre.equals("password")) clave = valor;
            else {
                if (!resto.isEmpty()) resto.append('&');
                resto.append(par);
            }
        }
        urlSinClave = resto.isEmpty() ? base : base + "?" + resto;
        if (usuario == null || usuario.isBlank() || clave == null) {
            throw new IllegalStateException("HC_PG_TEST_URL sin user o password");
        }
    }

    private static void ejecutarScript(JdbcTemplate plantilla, String sql) {
        StringBuilder stmt = new StringBuilder();
        for (String linea : sql.split("\n")) {
            if (linea.trim().startsWith("--")) continue;
            stmt.append(linea).append('\n');
            if (linea.trim().endsWith(";")) {
                String listo = stmt.toString().trim();
                if (!listo.isEmpty()) plantilla.execute(listo);
                stmt.setLength(0);
            }
        }
    }
}
