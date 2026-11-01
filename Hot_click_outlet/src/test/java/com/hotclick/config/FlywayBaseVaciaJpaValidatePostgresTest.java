package com.hotclick.config;

import com.hotclick.HotclickApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Arranque REAL del contexto Spring sobre un Postgres VACÍO (Testcontainers pgvector:pg17):
 * Flyway corre por el camino {@code hotclick.flyway.base-vacia.enabled=true} (esquema base +
 * baseline V1 + V2..VN reales) y después Hibernate valida TODO el mapeo JPA con
 * {@code ddl-auto=validate}. Si falta una tabla o columna que espera una entidad, el contexto no
 * levanta y el test falla (lo que vio CI/CD en staging con hot_click_carrito_item_tb).
 * En CI (CI=true) exige Docker. Local sin Docker: se salta, salvo
 * {@code -Dhotclick.it.pg.url=jdbc:postgresql://...} (servidor desechable; crea su propia base).
 *
 * El contexto se arranca con {@link SpringApplicationBuilder} y se cierra al terminar, FUERA del
 * cache de contextos de Spring Test: así no desaloja (ni dispara el create-drop de) los contextos
 * H2 compartidos (jdbc:h2:mem:testdb) que reutilizan los BaseIntegrationTest.
 */
class FlywayBaseVaciaJpaValidatePostgresTest {

    @Test
    void contexto_arranca_con_ddl_validate_sobre_base_creada_desde_V1() {
        String adminUrl;
        String user;
        String pass;
        PostgreSQLContainer<?> pg = null;
        String externo = System.getProperty("hotclick.it.pg.url");
        if (externo != null && !externo.isBlank()) {
            adminUrl = externo;
            user = System.getProperty("hotclick.it.pg.user", "postgres");
            pass = System.getProperty("hotclick.it.pg.password", "");
        } else {
            boolean docker = DockerClientFactory.instance().isDockerAvailable();
            if (!docker && "true".equalsIgnoreCase(System.getenv("CI"))) {
                throw new IllegalStateException("CI sin Docker: FlywayBaseVaciaJpaValidatePostgresTest no puede correr");
            }
            assumeTrue(docker, "Docker no disponible: arranque JPA validate sobre base vacía no corrido");
            pg = new PostgreSQLContainer<>(DockerImageName.parse("pgvector/pgvector:pg17")
                .asCompatibleSubstituteFor("postgres"));
            pg.start();
            adminUrl = pg.getJdbcUrl();
            user = pg.getUsername();
            pass = pg.getPassword();
        }
        try {
            String nombre = "hc_validate_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            new JdbcTemplate(new DriverManagerDataSource(adminUrl, user, pass)).execute("CREATE DATABASE " + nombre);
            String url = adminUrl.replaceFirst("/[^/?]+(\\?|$)", "/" + nombre + "$1");
            // Prerrequisito documentado: la extensión vector la crea un superusuario ANTES (V62).
            new JdbcTemplate(new DriverManagerDataSource(url, user, pass)).execute("CREATE EXTENSION IF NOT EXISTS vector");

            Map<String, Object> props = new HashMap<>();
            props.put("spring.datasource.url", url);
            props.put("spring.datasource.username", user);
            props.put("spring.datasource.password", pass);
            props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
            props.put("spring.flyway.enabled", "true");
            props.put(FlywayRepairConfig.PROP_BASE_VACIA, "true");
            props.put("spring.jpa.hibernate.ddl-auto", "validate");
            props.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
            props.put("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
            props.put("spring.jpa.defer-datasource-initialization", "false");
            props.put("spring.sql.init.mode", "never");

            // Si run() vuelve, Hibernate validó todas las entidades contra el esquema de Flyway.
            try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(HotclickApplication.class)
                    .profiles("test")
                    .web(WebApplicationType.NONE)
                    // Como argumentos: ganan sobre application-test.properties (H2, flyway off).
                    .run(props.entrySet().stream().map(e -> "--" + e.getKey() + "=" + e.getValue())
                        .toArray(String[]::new))) {
                JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
                assertEquals(0, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM flyway_schema_history WHERE NOT success", Integer.class));
                for (String t : new String[] {"hot_click_carrito_item_tb", "hot_click_estado_tb",
                    "hot_click_giro_ruleta_tb", "hot_click_premio_tb", "hot_click_referido_tb",
                    "hot_click_resultado_ruleta_tb"}) {
                    assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name = ?", Integer.class, t), t);
                }
                assertTrue(jdbc.queryForObject(
                    "SELECT COUNT(*) FROM hot_click_estado_tb WHERE id_estado IN (1, 2, 5)", Integer.class) == 3,
                    "estados base sembrados en la tabla JPA");
            }
        } finally {
            if (pg != null) {
                pg.stop();
            }
        }
    }
}
