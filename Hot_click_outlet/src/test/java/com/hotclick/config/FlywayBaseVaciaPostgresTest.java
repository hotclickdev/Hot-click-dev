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
        String correoSeed = jdbc.queryForObject(
            "SELECT correo FROM hot_click_usuario_tb WHERE id_usuario = 1", String.class);
        assertTrue(correoSeed.endsWith("@hotclick.lat"), "seed admin fuera de hotclick.lat: " + correoSeed);
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
}
