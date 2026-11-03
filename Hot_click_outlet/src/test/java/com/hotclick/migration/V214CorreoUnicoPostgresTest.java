package com.hotclick.migration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * B9 con PostgreSQL real: aplica el archivo V214 sobre una tabla mínima en un schema temporal.
 * Opt-in como {@code CupoEmprendedorPostgresTest}: {@code HC_PG_TEST_URL=jdbc:postgresql://…}.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
class V214CorreoUnicoPostgresTest {

    private static final String SCHEMA = "hc_v214_correo_test";
    private JdbcTemplate admin;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        String base = System.getenv("HC_PG_TEST_URL");
        admin = new JdbcTemplate(new DriverManagerDataSource(base));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        jdbc = new JdbcTemplate(new DriverManagerDataSource(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA));
        jdbc.execute("CREATE TABLE hot_click_usuario_tb (id_usuario SERIAL PRIMARY KEY, correo VARCHAR(150) NOT NULL, fk_id_estado INT NOT NULL)");
    }

    @AfterEach
    void tearDown() {
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    private void aplicarV214() throws Exception {
        jdbc.execute(Files.readString(V214CorreoUnicoMigracionTest.V214));
    }

    @Test
    void rechazaCorreoQueSoloDifiereEnMayusculas() throws Exception {
        aplicarV214();
        jdbc.update("INSERT INTO hot_click_usuario_tb (correo, fk_id_estado) VALUES ('ana@example.com', 1)");
        assertThatThrownBy(() -> jdbc.update("INSERT INTO hot_click_usuario_tb (correo, fk_id_estado) VALUES ('Ana@Example.com', 1)"))
            .isInstanceOf(DataIntegrityViolationException.class);
        // Un usuario eliminado (estado 3) puede repetir correo, igual que en V15.
        jdbc.update("INSERT INTO hot_click_usuario_tb (correo, fk_id_estado) VALUES ('ANA@example.com', 3)");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM hot_click_usuario_tb", Integer.class)).isEqualTo(2);
    }

    @Test
    void conDuplicadosPreviosLaMigracionFallaSinTocarDatos() {
        jdbc.update("INSERT INTO hot_click_usuario_tb (correo, fk_id_estado) VALUES ('ana@example.com', 1), ('Ana@Example.com', 1)");
        assertThatThrownBy(this::aplicarV214).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM hot_click_usuario_tb", Integer.class)).isEqualTo(2);
    }
}
