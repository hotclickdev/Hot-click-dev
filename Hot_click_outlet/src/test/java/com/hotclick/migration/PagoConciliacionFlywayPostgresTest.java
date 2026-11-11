package com.hotclick.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * fix2 (V237/V238) sobre el PostgreSQL REAL del job {@code onvo-alta-pg} (no QA, no producción). Schema propio
 * {@value #SCHEMA}, recreado en cada test. Las migraciones V1..V236 no son reproducibles en cadena (V1 era baseline
 * legacy), así que se parte de un schema VACÍO, se crea a mano el estado mínimo de {@code hot_click_pago_tb} al que
 * llegan V237/V238 (V236 SINTÉTICO, con una fila previa) y Flyway baselinea en 236 con la MISMA configuración que la
 * app (classpath:db/migration, validate-on-migrate, sin out-of-order). V237 y V238 se aplican desde los archivos
 * reales del classpath, no copias.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("PostgreSQL: Flyway V236 sintético → V237/V238 (validate, sin reaplicar, nullable, índices)")
class PagoConciliacionFlywayPostgresTest {

    static final String SCHEMA = "hc_fix2_flyway";

    private static final List<String> COLUMNAS_V237_V238 = List.of(
        "onvo_payment_intent_id", "cancelacion_solicitada_en", "cancelacion_solicitada_origen",
        "conciliacion_intentos", "conciliacion_proxima_en", "conciliacion_resuelta_en", "conciliacion_sin_referencia_en");

    private JdbcTemplate admin;
    private JdbcTemplate jdbc;
    private DataSource ds;

    @BeforeEach
    void schemaVacio() {
        String base = System.getenv("HC_PG_TEST_URL");
        admin = new JdbcTemplate(new DriverManagerDataSource(base));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        ds = new DriverManagerDataSource(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        jdbc = new JdbcTemplate(ds);
    }

    @AfterEach
    void borrarSchema() {
        if (admin != null) admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    /** Estado mínimo de hot_click_pago_tb antes de V237 (solo lo que V237/V238 y sus índices tocan) + una fila vieja. */
    private void v236Sintetico() {
        jdbc.execute("""
            CREATE TABLE hot_click_pago_tb (
                id_pago BIGSERIAL PRIMARY KEY,
                estado_pago VARCHAR(30) NOT NULL,
                proveedor VARCHAR(30),
                merchant_token VARCHAR(255),
                monto INTEGER,
                fecha_creacion TIMESTAMP)
            """);
        jdbc.update("INSERT INTO hot_click_pago_tb (estado_pago, proveedor, merchant_token, monto, fecha_creacion) "
            + "VALUES ('CANCELADO', 'ONVO', 'cs_hist_v236', 1000, TIMESTAMP '2026-01-01 10:00:00')");
    }

    /** Misma configuración Flyway que application.properties, con baseline en el V236 sintético. */
    private Flyway flyway(String target) {
        var conf = Flyway.configure()
            .dataSource(ds)
            .schemas(SCHEMA)
            .defaultSchema(SCHEMA)
            .createSchemas(false)
            .locations("classpath:db/migration")
            .validateOnMigrate(true)
            .outOfOrder(false)
            .baselineOnMigrate(true)
            .baselineVersion("236")
            .baselineDescription("V236 sintetico fix2");
        if (target != null) conf = conf.target(target);
        return conf.load();
    }

    private int tablasEnSchema() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?",
            Integer.class, SCHEMA);
    }

    private List<Map<String, Object>> historial() {
        return jdbc.queryForList("SELECT version, description, type, success, checksum FROM " + SCHEMA
            + ".flyway_schema_history ORDER BY installed_rank");
    }

    @Test
    @DisplayName("vacioSinteticoV236MigraV237V238")
    void vacioSinteticoV236MigraV237V238() {
        assertThat(tablasEnSchema()).isZero();
        v236Sintetico();

        MigrateResult r = flyway(null).migrate();

        assertThat(r.success).isTrue();
        assertThat(r.migrationsExecuted).isEqualTo(2);
        assertThat(r.migrations.stream().map(m -> m.version).toList()).containsExactly("237", "238");
        assertThat(r.targetSchemaVersion).isEqualTo("238");
        var h = historial();
        assertThat(h).extracting(m -> m.get("version")).containsExactly("236", "237", "238");
        assertThat(h.get(0).get("type")).isEqualTo("BASELINE");
        assertThat(h).allSatisfy(m -> assertThat(m.get("success")).isEqualTo(Boolean.TRUE));
    }

    @Test
    @DisplayName("validateYSegundoMigrateSinReaplicar")
    void validateYSegundoMigrateSinReaplicar() {
        v236Sintetico();
        flyway(null).migrate();
        var antes = historial();

        var v = flyway(null).validateWithResult();
        assertThat(v.validationSuccessful).as("validate: %s", v.errorDetails).isTrue();
        MigrateResult segundo = flyway(null).migrate();

        assertThat(segundo.success).isTrue();
        assertThat(segundo.migrationsExecuted).isZero();
        assertThat(historial()).isEqualTo(antes);
        MigrationInfo actual = flyway(null).info().current();
        assertThat(actual.getVersion().getVersion()).isEqualTo("238");
        assertThat(Arrays.stream(flyway(null).info().pending())).isEmpty();
    }

    @Test
    @DisplayName("incrementalV237LuegoV238")
    void incrementalV237LuegoV238() {
        v236Sintetico();
        MigrateResult hasta237 = flyway("237").migrate();
        assertThat(hasta237.migrationsExecuted).isEqualTo(1);
        assertThat(columnas()).containsKey("onvo_payment_intent_id").doesNotContainKey("conciliacion_intentos");

        MigrateResult resto = flyway(null).migrate();

        assertThat(resto.migrations.stream().map(m -> m.version).toList()).containsExactly("238");
        assertThat(columnas()).containsKeys(COLUMNAS_V237_V238.toArray(String[]::new));
    }

    @Test
    @DisplayName("columnasNullableIndicesYSinBackfill")
    void columnasNullableIndicesYSinBackfill() {
        v236Sintetico();
        flyway(null).migrate();

        Map<String, Map<String, Object>> cols = columnas();
        for (String c : COLUMNAS_V237_V238) {
            assertThat(cols).as("columna %s", c).containsKey(c);
            assertThat(cols.get(c).get("is_nullable")).as("nullable %s", c).isEqualTo("YES");
            assertThat(cols.get(c).get("column_default")).as("sin DEFAULT %s", c).isNull();
        }
        assertThat(cols.get("conciliacion_intentos").get("data_type")).isEqualTo("integer");
        assertThat(cols.get("conciliacion_proxima_en").get("data_type")).isEqualTo("timestamp without time zone");
        assertThat(cols.get("cancelacion_solicitada_origen").get("character_maximum_length")).isEqualTo(20);

        String parcial = jdbc.queryForObject("SELECT indexdef FROM pg_indexes WHERE schemaname = ? AND indexname = ?",
            String.class, SCHEMA, "idx_hot_click_pago_conciliacion_pendiente");
        assertThat(parcial).contains("(conciliacion_proxima_en)").contains("WHERE")
            .contains("conciliacion_resuelta_en IS NULL").contains("FALLIDO").contains("CANCELADO");
        Integer intent = jdbc.queryForObject("SELECT COUNT(*) FROM pg_indexes WHERE schemaname = ? AND indexname = ?",
            Integer.class, SCHEMA, "idx_hot_click_pago_onvo_payment_intent_id");
        assertThat(intent).isEqualTo(1);

        // Sin backfill: la fila previa a V237 queda con todas las columnas nuevas en NULL.
        Map<String, Object> vieja = jdbc.queryForMap("SELECT * FROM hot_click_pago_tb WHERE merchant_token = 'cs_hist_v236'");
        for (String c : COLUMNAS_V237_V238) {
            assertThat(vieja.get(c)).as("sin backfill %s", c).isNull();
        }
        assertThat(vieja.get("estado_pago")).isEqualTo("CANCELADO");
    }

    private Map<String, Map<String, Object>> columnas() {
        var filas = jdbc.queryForList("SELECT column_name, is_nullable, column_default, data_type, character_maximum_length "
            + "FROM information_schema.columns WHERE table_schema = ? AND table_name = 'hot_click_pago_tb'", SCHEMA);
        Map<String, Map<String, Object>> m = new java.util.HashMap<>();
        for (var f : filas) m.put((String) f.get("column_name"), f);
        return m;
    }
}
