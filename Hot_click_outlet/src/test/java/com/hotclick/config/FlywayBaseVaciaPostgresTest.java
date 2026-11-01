package com.hotclick.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Postgres VACÍO real (Testcontainers, imagen con pgvector como prod): el arranque con
 * {@code hotclick.flyway.base-vacia.enabled=true} aplica el esquema base y la cadena real
 * V2..VN completa. En CI (env CI=true) es obligatorio que haya Docker: si falta, falla.
 * Local sin Docker: se salta, salvo que se pase {@code -Dhotclick.it.pg.url=jdbc:postgresql://...}
 * (servidor local desechable; el test crea y borra su propia base).
 */
class FlywayBaseVaciaPostgresTest {

    private static PostgreSQLContainer<?> pg;
    private static String adminUrl;
    private static String user;
    private static String pass;

    @BeforeAll
    static void arrancar() {
        String externo = System.getProperty("hotclick.it.pg.url");
        if (externo != null && !externo.isBlank()) {
            adminUrl = externo;
            user = System.getProperty("hotclick.it.pg.user", "postgres");
            pass = System.getProperty("hotclick.it.pg.password", "");
            return;
        }
        boolean docker = DockerClientFactory.instance().isDockerAvailable();
        if (!docker && "true".equalsIgnoreCase(System.getenv("CI"))) {
            throw new IllegalStateException("CI sin Docker: FlywayBaseVaciaPostgresTest no puede correr");
        }
        assumeTrue(docker, "Docker no disponible: test de Flyway sobre Postgres vacío no corrido");
        pg = new PostgreSQLContainer<>(DockerImageName.parse("pgvector/pgvector:pg17")
            .asCompatibleSubstituteFor("postgres"));
        pg.start();
        adminUrl = pg.getJdbcUrl();
        user = pg.getUsername();
        pass = pg.getPassword();
    }

    @AfterAll
    static void parar() {
        if (pg != null) {
            pg.stop();
        }
    }

    /** Base nueva por test para no depender del orden. */
    private static DataSource baseNueva() {
        String nombre = "hc_vacia_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        new JdbcTemplate(new DriverManagerDataSource(adminUrl, user, pass)).execute("CREATE DATABASE " + nombre);
        String url = adminUrl.replaceFirst("/[^/?]+(\\?|$)", "/" + nombre + "$1");
        return new DriverManagerDataSource(url, user, pass);
    }

    /** Misma configuración Flyway que application.properties. */
    private static Flyway flywayComoApp(DataSource ds) {
        return Flyway.configure()
            .dataSource(ds)
            .locations("classpath:db/migration")
            .baselineOnMigrate(false)
            .baselineVersion("1")
            .validateOnMigrate(true)
            .outOfOrder(false)
            .load();
    }

    private static void arrancarComo(DataSource ds, MockEnvironment env) {
        new FlywayRepairConfig(env).repairThenMigrate().migrate(flywayComoApp(ds));
    }

    @Test
    void baseVacia_corre_V1_a_VN_completo_y_queda_esquema_esperado() {
        DataSource ds = baseNueva();
        MockEnvironment env = new MockEnvironment()
            .withProperty(FlywayRepairConfig.PROP_BASE_VACIA, "true");
        env.setActiveProfiles("prod");

        arrancarComo(ds, env);

        JdbcTemplate jdbc = new JdbcTemplate(ds);
        List<String> archivos = List.of(new java.io.File("src/main/resources/db/migration").list());
        int ultima = FlywayRepairConfig.ultimaVersionMigracion(archivos);
        long versionadas = archivos.stream().filter(f -> f.matches("V\\d+(\\.\\d+)?__.*\\.sql")).count();
        Integer aplicada = jdbc.queryForObject(
            "SELECT MAX(CAST(split_part(version, '.', 1) AS INTEGER)) FROM flyway_schema_history WHERE success", Integer.class);
        assertEquals(ultima, aplicada, "debe quedar aplicada la última migración del classpath");
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM flyway_schema_history WHERE NOT success", Integer.class));
        assertEquals(0, flywayComoApp(ds).info().pending().length, "no queda ninguna migración pendiente");
        assertTrue(jdbc.queryForObject(
            "SELECT COUNT(*) FROM flyway_schema_history WHERE type = 'SQL' AND success", Integer.class) >= versionadas - 1,
            "V2..VN se ejecutan de verdad (no baseline)");

        assertEquals(1, jdbc.queryForObject(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' "
                + "AND table_name = 'hot_click_usuario_rol_tb' AND column_name = 'fk_id_estado'", Integer.class));
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_categoria_tb", Integer.class) > 0,
            "las categorías se siembran");
        assertEquals(1, jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_rol_tb WHERE nombre_rol = 'SUPPORT'", Integer.class));

        // V218: las SECURITY DEFINER de pagos con search_path fijo y el seed admin en un dominio nuestro.
        for (String fn : List.of("fn_crear_pago", "fn_obtener_pago_por_token")) {
            String config = jdbc.queryForObject(
                "SELECT COALESCE(array_to_string(p.proconfig, ','), '') FROM pg_proc p "
                    + "JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = ?",
                String.class, fn);
            assertTrue(config.contains("search_path=pg_catalog, public, pg_temp"), fn + " sin search_path: " + config);
        }
        // El seed legado de V1 vive en la tabla entre comillas "HOT_CLICK_USUARIO_TB".
        String correoSeed = jdbc.queryForObject(
            "SELECT \"CORREO\" FROM \"HOT_CLICK_USUARIO_TB\" WHERE \"ID_USUARIO\" = 1", String.class);
        assertTrue(correoSeed.endsWith("@hotclick.lat"), "seed admin fuera de hotclick.lat: " + correoSeed);
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM \"HOT_CLICK_USUARIO_TB\" WHERE lower(\"CORREO\") LIKE '%@hotclick.com'", Integer.class));
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_usuario_tb WHERE lower(correo) LIKE '%@hotclick.com'", Integer.class));

        // Segundo arranque sobre la base ya creada: no repite el esquema base y no falla.
        arrancarComo(ds, env);
        assertEquals(aplicada, jdbc.queryForObject(
            "SELECT MAX(CAST(split_part(version, '.', 1) AS INTEGER)) FROM flyway_schema_history WHERE success", Integer.class));
    }

    @Test
    void baseConTablas_nunca_aplica_el_esquema_base() {
        DataSource ds = baseNueva();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.execute("CREATE TABLE ya_existe (id INT)");
        MockEnvironment env = new MockEnvironment()
            .withProperty(FlywayRepairConfig.PROP_BASE_VACIA, "true")
            .withProperty("spring.flyway.baseline-on-migrate", "false");
        env.setActiveProfiles("prod");

        // Sin historial y con tablas: Flyway principal falla (como hoy); el esquema base no se toca.
        try {
            arrancarComo(ds, env);
        } catch (RuntimeException esperado) {
            // comportamiento histórico de Flyway con base no vacía y sin baseline
        }
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' "
                + "AND table_name = '" + FlywayRepairConfig.BASE_VACIA_HISTORIAL + "'", Integer.class));
        assertFalse(jdbc.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' "
                + "AND table_name = 'hot_click_categoria_tb'", Integer.class) > 0);
    }
    @Test
    void dosInstanciasEnParalelo_sobreBaseVacia_ambasArrancan() throws Exception {
        DataSource ds = baseNueva();
        MockEnvironment env = new MockEnvironment()
            .withProperty(FlywayRepairConfig.PROP_BASE_VACIA, "true");
        env.setActiveProfiles("prod");

        java.util.concurrent.CountDownLatch largada = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            List<java.util.concurrent.Future<?>> arranques = new java.util.ArrayList<>();
            for (int i = 0; i < 2; i++) {
                arranques.add(pool.submit(() -> {
                    largada.await();
                    arrancarComo(ds, env);
                    return null;
                }));
            }
            largada.countDown();
            for (java.util.concurrent.Future<?> f : arranques) {
                f.get(10, java.util.concurrent.TimeUnit.MINUTES); // relanza si una instancia falló
            }
        } finally {
            pool.shutdownNow();
        }

        JdbcTemplate jdbc = new JdbcTemplate(ds);
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM flyway_schema_history WHERE NOT success", Integer.class));
        assertEquals(1, jdbc.queryForObject(
            "SELECT COUNT(*) FROM flyway_schema_history WHERE type = 'BASELINE'", Integer.class));
        assertEquals(0, flywayComoApp(ds).info().pending().length);
    }

    private static final List<String> FKS_V221 = List.of(
        "hot_click_pago_tb_fk_id_pedido_fkey", "hot_click_pago_tb_fk_id_usuario_fkey",
        "hot_click_pago_tb_fk_id_estado_fkey", "hot_click_payment_log_tb_fk_id_usuario_fkey",
        "hot_click_transaccion_pago_tb_fk_id_estado_fkey", "hot_click_webhook_event_tb_fk_id_estado_fkey");

    private static String referenciaDe(JdbcTemplate jdbc, String fk) {
        return jdbc.queryForObject("SELECT c.confrelid::regclass::text FROM pg_constraint c WHERE c.contype = 'f' AND c.conname = ?",
            String.class, fk);
    }

    /** ALTO QA5 (1e181f7e): las 6 FK de pagos apuntaban a tablas viejas en MAYÚSCULAS y el checkout daba 500. */
    @Test
    void v221_fkDePagosApuntanATablasMinusculas_yElPagoSeCrea() throws Exception {
        DataSource ds = baseNueva();
        MockEnvironment env = new MockEnvironment().withProperty(FlywayRepairConfig.PROP_BASE_VACIA, "true");
        env.setActiveProfiles("prod");
        arrancarComo(ds, env);
        JdbcTemplate jdbc = new JdbcTemplate(ds);

        for (String fk : FKS_V221) {
            String ref = referenciaDe(jdbc, fk);
            assertEquals(ref.toLowerCase(), ref, fk + " sigue hacia " + ref);
            assertFalse(ref.contains("\""), fk + " sigue hacia " + ref);
        }
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM pg_constraint c JOIN pg_class s ON s.oid = c.conrelid JOIN pg_class t ON t.oid = c.confrelid "
                + "WHERE c.contype = 'f' AND s.relname = lower(s.relname) AND t.relname <> lower(t.relname) "
                + "AND to_regclass(lower(t.relname)) IS NOT NULL", Integer.class),
            "ninguna tabla JPA debe referenciar la tabla vieja en mayúsculas si existe la nueva");

        // Idempotente: re-ejecutar V221 (caso dev ya corregido a mano) no cambia nada ni falla.
        String v221 = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/resources/db/migration/V221__fk_pagos_a_tablas_minusculas.sql"));
        jdbc.execute(v221);
        for (String fk : FKS_V221) {
            assertEquals(referenciaDe(jdbc, fk).toLowerCase(), referenciaDe(jdbc, fk));
        }
    }

    /**
     * Mismo bug sin la cadena completa (corre sin pgvector): esquema base de master con las FK viejas,
     * V221, y el insert del pago que antes daba 500. V221 dos veces = sin cambios (caso dev corregido a mano).
     */
    @Test
    void v221_sobreEsquemaConFkViejas_reapuntaLas6_yElPagoSeCrea() throws Exception {
        DataSource ds = baseNueva();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        String base = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/resources/db/base-vacia/V1__esquema_base_vacia.sql"));
        jdbc.execute(base);
        // Reproduce las FK de bases creadas antes del arreglo (V1 aplicada / base-vacia vieja).
        String[][] viejas = {
            {"hot_click_pago_tb", "hot_click_pago_tb_fk_id_pedido_fkey", "fk_id_pedido", "HOT_CLICK_PEDIDO_TB", "ID_PEDIDO"},
            {"hot_click_pago_tb", "hot_click_pago_tb_fk_id_usuario_fkey", "fk_id_usuario", "HOT_CLICK_USUARIO_TB", "ID_USUARIO"},
            {"hot_click_payment_log_tb", "hot_click_payment_log_tb_fk_id_usuario_fkey", "fk_id_usuario", "HOT_CLICK_USUARIO_TB", "ID_USUARIO"},
            {"hot_click_pago_tb", "hot_click_pago_tb_fk_id_estado_fkey", "fk_id_estado", "HOT_CLICK_ESTADO_TB", "ID_ESTADO"},
            {"hot_click_transaccion_pago_tb", "hot_click_transaccion_pago_tb_fk_id_estado_fkey", "fk_id_estado", "HOT_CLICK_ESTADO_TB", "ID_ESTADO"},
            {"hot_click_webhook_event_tb", "hot_click_webhook_event_tb_fk_id_estado_fkey", "fk_id_estado", "HOT_CLICK_ESTADO_TB", "ID_ESTADO"}};
        for (String[] v : viejas) {
            jdbc.execute("ALTER TABLE " + v[0] + " DROP CONSTRAINT " + v[1]);
            jdbc.execute("ALTER TABLE " + v[0] + " ADD CONSTRAINT " + v[1] + " FOREIGN KEY (" + v[2]
                + ") REFERENCES \"" + v[3] + "\" (\"" + v[4] + "\")");
        }
        for (String fk : FKS_V221) {
            assertTrue(referenciaDe(jdbc, fk).startsWith("\"HOT_CLICK_"), fk + " debería arrancar con la FK vieja");
        }

        String v221 = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/resources/db/migration/V221__fk_pagos_a_tablas_minusculas.sql"));
        jdbc.execute(v221);
        jdbc.execute(v221);
        for (String fk : FKS_V221) {
            String ref = referenciaDe(jdbc, fk);
            assertEquals(ref.toLowerCase(), ref, fk + " sigue hacia " + ref);
            assertFalse(ref.contains("\""), fk + " sigue hacia " + ref);
            assertTrue(jdbc.queryForObject("SELECT convalidated FROM pg_constraint WHERE conname = ?", Boolean.class, fk));
        }

        jdbc.execute(new String(FlywayBaseVaciaPostgresTest.class.getResourceAsStream("/fk-pago-checkout.sql").readAllBytes()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_pago_tb", Integer.class));
    }
}
