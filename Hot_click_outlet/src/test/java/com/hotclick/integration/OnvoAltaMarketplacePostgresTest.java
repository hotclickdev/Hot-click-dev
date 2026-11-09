package com.hotclick.integration;

import com.hotclick.catalogo.CatalogoPublicoGate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Postgres del job de CI (no producción). El listado usa el mismo fragmento que el catálogo
 * y el índice único de V125 impide un segundo COBRO_OK de la misma factura.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("Postgres: marketplace oculta REQUIERE_MEMBRESIA y el ledger no duplica la factura")
class OnvoAltaMarketplacePostgresTest {

    private static final String SCHEMA = "hc_onvo_alta_mkt";

    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        String base = System.getenv("HC_PG_TEST_URL");
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(base));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        String conSchema = base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA;
        jdbc = new JdbcTemplate(new DriverManagerDataSource(conSchema));
        jdbc.execute("""
            CREATE TABLE hot_click_empresa_tb (
                id_empresa BIGSERIAL PRIMARY KEY,
                estado_empresa VARCHAR(30) NOT NULL,
                visibilidad_publica BOOLEAN NOT NULL,
                estado_plan VARCHAR(20),
                slug VARCHAR(80))
            """);
        jdbc.execute("""
            CREATE TABLE hot_click_producto_tb (
                id_producto BIGSERIAL PRIMARY KEY,
                nombre_producto VARCHAR(160) NOT NULL,
                fk_id_estado INT NOT NULL,
                visible_catalogo BOOLEAN NOT NULL,
                vendido BOOLEAN NOT NULL,
                fk_id_empresa BIGINT NOT NULL)
            """);
        jdbc.execute("""
            CREATE TABLE hot_click_billing_ledger_tb (
                id_billing_ledger BIGSERIAL PRIMARY KEY,
                referencia_externa VARCHAR(120),
                tipo VARCHAR(40) NOT NULL)
            """);
        jdbc.execute("""
            CREATE UNIQUE INDEX idx_billing_ledger_ref_tipo
                ON hot_click_billing_ledger_tb (referencia_externa, tipo)
                WHERE referencia_externa IS NOT NULL
            """);
    }

    @AfterEach
    void tearDown() {
        String base = System.getenv("HC_PG_TEST_URL");
        if (base == null) return;
        new JdbcTemplate(new DriverManagerDataSource(base))
            .execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    @Test
    @DisplayName("ocultaRequiereMembresia")
    void ocultaRequiereMembresia() {
        Long sinPago = empresa("ACTIVO", true, "REQUIERE_MEMBRESIA", "sin-pago");
        Long alDia = empresa("ACTIVO", true, "ACTIVO", "al-dia");
        Long trial = empresa("ACTIVO", true, "TRIAL", "en-trial");
        producto("Oculto", sinPago);
        producto("Visible", alDia);
        producto("Trial visible", trial);

        var nombres = jdbc.queryForList(
            "SELECT p.nombre_producto FROM hot_click_producto_tb p "
                + "INNER JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa "
                + "WHERE p.fk_id_estado = 1 AND p.visible_catalogo = TRUE AND p.vendido = FALSE AND "
                + CatalogoPublicoGate.SQL_LISTADO,
            String.class);

        assertThat(nombres).contains("Visible", "Trial visible").doesNotContain("Oculto");
    }

    @Test
    @DisplayName("replayFacturaNoDuplicaCobroOk")
    void replayFacturaNoDuplicaCobroOk() {
        jdbc.update("INSERT INTO hot_click_billing_ledger_tb (referencia_externa, tipo) VALUES ('inv_paid_alta', 'COBRO_OK')");
        assertThatThrownBy(() -> jdbc.update(
            "INSERT INTO hot_click_billing_ledger_tb (referencia_externa, tipo) VALUES ('inv_paid_alta', 'COBRO_OK')"))
            .isInstanceOf(DataIntegrityViolationException.class);
        Integer n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_billing_ledger_tb WHERE referencia_externa = 'inv_paid_alta' AND tipo = 'COBRO_OK'",
            Integer.class);
        assertThat(n).isEqualTo(1);
    }

    private Long empresa(String estadoEmpresa, boolean visible, String estadoPlan, String slug) {
        return jdbc.queryForObject(
            "INSERT INTO hot_click_empresa_tb (estado_empresa, visibilidad_publica, estado_plan, slug) "
                + "VALUES (?, ?, ?, ?) RETURNING id_empresa",
            Long.class, estadoEmpresa, visible, estadoPlan, slug);
    }

    private void producto(String nombre, Long empresaId) {
        jdbc.update(
            "INSERT INTO hot_click_producto_tb (nombre_producto, fk_id_estado, visible_catalogo, vendido, fk_id_empresa) "
                + "VALUES (?, 1, TRUE, FALSE, ?)",
            nombre, empresaId);
    }
}
