package com.hotclick.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import java.sql.Types;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Búsqueda de la auditoría admin en PostgreSQL. En prod fallaba con «function lower(bytea) does not exist»:
 * el String null se enlazaba sin tipo. Ahora el servicio manda '' (AuditoriaAdminConsultaService.filtroTexto)
 * y la consulta compara con ''. Opt-in como PedidoOrigenPostgresTest: {@code HC_PG_TEST_URL=jdbc:postgresql://…}.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("Auditoría admin: filtro por correo sin lower(bytea) en PostgreSQL")
class AuditoriaBusquedaPostgresTest {

    private static final String SCHEMA = "hc_auditoria_busqueda_test";
    /** Forma SQL de AuditoriaAdminRepository.buscar (filtros de texto). */
    private static final String NUEVA = "SELECT count(*) FROM aud WHERE (? = '' OR accion = ?) "
        + "AND (? = '' OR lower(admin_email) LIKE lower(concat('%', ?, '%')))";
    private SingleConnectionDataSource ds;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        ds = new SingleConnectionDataSource(System.getenv("HC_PG_TEST_URL"), true);
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        jdbc.execute("CREATE SCHEMA " + SCHEMA);
        jdbc.execute("SET search_path TO " + SCHEMA);
        jdbc.execute("CREATE TABLE aud (id BIGSERIAL PRIMARY KEY, accion VARCHAR(80), admin_email VARCHAR(200))");
        jdbc.update("INSERT INTO aud (accion, admin_email) VALUES ('LOGIN','Ana@HotClick.lat'), ('APROBAR','beto@hotclick.lat')");
    }

    @AfterEach
    void tearDown() {
        jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        ds.destroy();
    }

    @Test
    void sinFiltrosDevuelveTodo() {
        String a = AuditoriaAdminConsultaService.filtroTexto(null);
        String e = AuditoriaAdminConsultaService.filtroTexto("  ");
        assertThat(jdbc.queryForObject(NUEVA, Integer.class, a, a, e, e)).isEqualTo(2);
    }

    @Test
    void filtraPorCorreoSinDistinguirMayusculas() {
        assertThat(jdbc.queryForObject(NUEVA, Integer.class, "", "", "ana", "ana")).isEqualTo(1);
        assertThat(jdbc.queryForObject(NUEVA, Integer.class, "APROBAR", "APROBAR", "", "")).isEqualTo(1);
    }

    @Test
    @DisplayName("regresión: el null sin tipo como bytea reproduce el error de prod")
    void nullComoByteaFalla() {
        assertThatThrownBy(() -> jdbc.query(
            "SELECT count(*) FROM aud WHERE (? IS NULL OR lower(admin_email) LIKE lower(concat('%', ?, '%')))",
            ps -> { ps.setNull(1, Types.BINARY); ps.setNull(2, Types.BINARY); }, rs -> null))
            .hasMessageContaining("lower(bytea)");
    }
}
