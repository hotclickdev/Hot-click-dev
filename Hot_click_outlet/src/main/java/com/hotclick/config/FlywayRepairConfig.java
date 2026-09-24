package com.hotclick.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Llama repair() antes de migrate() para que Flyway actualice el checksum
 * de migraciones FAILED cuyo script fue corregido (idempotencia añadida).
 *
 * Con perfil {@code dev}:
 * <ul>
 *   <li>Aborta si el host JDBC no es local (localhost / 127.0.0.1 / postgres).</li>
 *   <li>Si la base está vacía: no rejuega V1..V136 (V1 es un dump legacy que choca
 *       con migraciones posteriores). Siembra tablas nativas, hace baseline en
 *       la última versión conocida, y deja que Hibernate {@code ddl-auto=update}
 *       arme el resto del esquema.</li>
 * </ul>
 */
@Configuration
public class FlywayRepairConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayRepairConfig.class);

    private static final Set<String> HOSTS_DEV_PERMITIDOS = Set.of(
        "localhost", "127.0.0.1", "postgres"
    );

    /** Tablas sin @Entity que el arranque necesita antes de Hibernate. */
    private static final String NATIVAS_DEV = "db/dev-bootstrap/nativas.sql";

    private final Environment environment;

    public FlywayRepairConfig(Environment environment) {
        this.environment = environment;
    }

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            assertDevHostIsLocal();
            if (esPerfilDev() && esquemaPublicoVacio(flyway)) {
                bootstrapDevVacio(flyway);
            }
            log.info("[flyway] Ejecutando repair() para sincronizar checksums de migraciones fallidas...");
            flyway.repair();
            log.info("[flyway] repair() completado. Iniciando migrate()...");
            flyway.migrate();
        };
    }

    /**
     * Solo aplica con perfil {@code dev}. Producción y test no se alteran.
     */
    void assertDevHostIsLocal() {
        if (!esPerfilDev()) {
            return;
        }
        String jdbcUrl = environment.getProperty("spring.datasource.url", "");
        String host = extraerHost(jdbcUrl);
        if (host == null || !HOSTS_DEV_PERMITIDOS.contains(host.toLowerCase(Locale.ROOT))) {
            throw new IllegalStateException(
                "[flyway] Perfil 'dev' activo pero spring.datasource.url no apunta a un host local. "
                    + "Host resuelto='" + host + "', url='" + jdbcUrl + "'. "
                    + "Permitidos: " + HOSTS_DEV_PERMITIDOS + ". "
                    + "Abortando para no migrar producción. Usá docker-compose.dev.yml "
                    + "y application-dev.properties (sin SPRING_DATASOURCE_URL apuntando a Supabase/RDS)."
            );
        }
        log.info("[flyway] Guardrail dev OK — host JDBC local: {}", host);
    }

    private boolean esPerfilDev() {
        return Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    private static boolean esquemaPublicoVacio(Flyway flyway) {
        try (Connection c = flyway.getConfiguration().getDataSource().getConnection();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery(
                 "SELECT COUNT(*) FROM information_schema.tables "
                     + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")) {
            rs.next();
            return rs.getInt(1) == 0;
        } catch (SQLException e) {
            throw new IllegalStateException("[flyway] No se pudo inspeccionar el esquema public", e);
        }
    }

    /**
     * Base vacía en dev: V1..V136 no son reproducibles en cadena (V1 era baseline
     * en prod y choca con V2+). Baseline en la última versión + tablas nativas;
     * Hibernate update completa el esquema de entidades.
     */
    private void bootstrapDevVacio(Flyway flyway) {
        log.warn(
            "[flyway] Base vacía + perfil dev: baseline sin rejugár V1..V136 "
                + "(historial legacy). Hibernate ddl-auto=update arma el esquema."
        );
        ejecutarSqlClasspath(flyway, NATIVAS_DEV);
        flyway.baseline();
        log.info("[flyway] Baseline dev aplicado. migrate() solo correrá versiones nuevas.");
    }

    private static void ejecutarSqlClasspath(Flyway flyway, String classpathLocation) {
        ClassPathResource resource = new ClassPathResource(classpathLocation);
        if (!resource.exists()) {
            throw new IllegalStateException("[flyway] Falta recurso " + classpathLocation);
        }
        try (Connection c = flyway.getConfiguration().getDataSource().getConnection();
             Statement s = c.createStatement();
             BufferedReader reader = new BufferedReader(
                 new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String sql = reader.lines().collect(Collectors.joining("\n"));
            for (String stmt : sql.split(";")) {
                String cleaned = Arrays.stream(stmt.split("\n"))
                    .filter(line -> !line.trim().startsWith("--"))
                    .collect(Collectors.joining("\n"))
                    .trim();
                if (cleaned.isEmpty()) {
                    continue;
                }
                s.execute(cleaned);
            }
        } catch (Exception e) {
            throw new IllegalStateException("[flyway] Falló bootstrap " + classpathLocation, e);
        }
    }

    /**
     * Extrae el host de un JDBC URL {@code jdbc:postgresql://host:port/db}.
     * Devuelve null si no se puede parsear.
     */
    static String extraerHost(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return null;
        }
        String trimmed = jdbcUrl.trim();
        if (!trimmed.regionMatches(true, 0, "jdbc:", 0, 5)) {
            return null;
        }
        try {
            URI uri = URI.create(trimmed.substring(5));
            return uri.getHost();
        } catch (IllegalArgumentException | NullPointerException e) {
            return null;
        }
    }
}
