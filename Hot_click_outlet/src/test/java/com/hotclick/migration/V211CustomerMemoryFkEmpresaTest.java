package com.hotclick.migration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Seguimiento BAJO de #434: FK customer_memory.empresa_id -> empresa, sin tocar filas existentes. */
class V211CustomerMemoryFkEmpresaTest {

    private static final String V1 = "11111111-1111-1111-1111-111111111111";
    private static final String V2 = "22222222-2222-2222-2222-222222222222";

    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource db = new DriverManagerDataSource("jdbc:h2:mem:v211"
            + UUID.randomUUID().toString().replace("-", "") + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(db);
        new ResourceDatabasePopulator(new ClassPathResource("customermemory/customer_memory_v210_h2.sql")).execute(db);
        jdbc.execute("CREATE TABLE hot_click_empresa_tb (id_empresa BIGINT PRIMARY KEY)");
        jdbc.execute("INSERT INTO hot_click_empresa_tb VALUES (11), (22)");
        // Filas previas a V211: una global (NULL) y una de tienda.
        jdbc.update("INSERT INTO customer_memory (visitor_id, empresa_id) VALUES (?, NULL)", V1);
        jdbc.update("INSERT INTO customer_memory (visitor_id, empresa_id) VALUES (?, 11)", V1);
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V211__customer_memory_fk_empresa.sql")).execute(db);
    }

    @AfterEach
    void tearDown() { jdbc.execute("SHUTDOWN"); }

    @Test
    @DisplayName("Las filas existentes (globales y de tienda) quedan intactas")
    void filasExistentesIntactas() {
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customer_memory", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customer_memory WHERE empresa_id IS NULL", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("NULL sigue permitido (memoria global)")
    void nullPermitido() {
        jdbc.update("INSERT INTO customer_memory (visitor_id, empresa_id) VALUES (?, NULL)", V2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customer_memory WHERE visitor_id = ?", Integer.class, V2)).isEqualTo(1);
    }

    @Test
    @DisplayName("Una empresa inexistente se rechaza")
    void empresaInexistenteRechazada() {
        assertThatThrownBy(() -> jdbc.update("INSERT INTO customer_memory (visitor_id, empresa_id) VALUES (?, 999)", V2))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Al borrar la tienda se borra su memoria; la global no se toca")
    void cascadaSoloDeLaTienda() {
        jdbc.update("DELETE FROM hot_click_empresa_tb WHERE id_empresa = 11");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customer_memory WHERE empresa_id = 11", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customer_memory WHERE empresa_id IS NULL", Integer.class)).isEqualTo(1);
    }
}
