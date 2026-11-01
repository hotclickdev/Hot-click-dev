package com.hotclick.config;

import com.hotclick.service.BccrService;
import com.hotclick.service.GeminiService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.analytics.PostHogCaptureService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

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
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
class FlywayBaseVaciaJpaValidatePostgresTest {

    private static PostgreSQLContainer<?> pg;

    @MockitoBean ResendEmailService resendEmailService;
    @MockitoBean NotificacionEmailService notificacionEmailService;
    @MockitoBean SupabaseStorageService supabaseStorageService;
    @MockitoBean BccrService bccrService;
    @MockitoBean GeminiService geminiService;
    @MockitoBean PostHogCaptureService postHogCaptureService;

    @Autowired JdbcTemplate jdbc;

    @DynamicPropertySource
    static void postgresVacio(DynamicPropertyRegistry r) {
        String adminUrl;
        String user;
        String pass;
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
        String nombre = "hc_validate_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        new JdbcTemplate(new DriverManagerDataSource(adminUrl, user, pass)).execute("CREATE DATABASE " + nombre);
        String url = adminUrl.replaceFirst("/[^/?]+(\\?|$)", "/" + nombre + "$1");
        // Prerrequisito documentado: la extensión vector la crea un superusuario ANTES (V62).
        new JdbcTemplate(new DriverManagerDataSource(url, user, pass)).execute("CREATE EXTENSION IF NOT EXISTS vector");

        r.add("spring.datasource.url", () -> url);
        r.add("spring.datasource.username", () -> user);
        r.add("spring.datasource.password", () -> pass);
        r.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        r.add("spring.flyway.enabled", () -> "true");
        r.add(FlywayRepairConfig.PROP_BASE_VACIA, () -> "true");
        r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        r.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        r.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        r.add("spring.jpa.defer-datasource-initialization", () -> "false");
        r.add("spring.sql.init.mode", () -> "never");
    }

    @AfterAll
    static void parar() {
        if (pg != null) {
            pg.stop();
        }
    }

    @Test
    void contexto_arranca_con_ddl_validate_sobre_base_creada_desde_V1() {
        // Si llegamos acá, Hibernate validó todas las entidades contra el esquema de Flyway.
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM flyway_schema_history WHERE NOT success", Integer.class));
        for (String t : new String[] {"hot_click_carrito_item_tb", "hot_click_estado_tb", "hot_click_giro_ruleta_tb",
            "hot_click_premio_tb", "hot_click_referido_tb", "hot_click_resultado_ruleta_tb"}) {
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables "
                + "WHERE table_schema = 'public' AND table_name = ?", Integer.class, t), t);
        }
        assertTrue(jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_estado_tb WHERE id_estado IN (1, 2, 5)", Integer.class) == 3,
            "estados base sembrados en la tabla JPA");
    }
}
