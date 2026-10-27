package com.hotclick.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Llama repair() antes de migrate() para que Flyway actualice el checksum
 * de migraciones FAILED cuyo script fue corregido (idempotencia añadida).
 *
 * Con perfil {@code dev}:
 * <ul>
 *   <li>Aborta si el host JDBC no es local (localhost / 127.0.0.1 / postgres).</li>
 *   <li>Si la base está vacía: no rejuega V1..VN (V1 es un dump legacy que choca
 *       con migraciones posteriores). Siembra tablas nativas, hace baseline en
 *       la última versión del classpath, y deja que Hibernate {@code ddl-auto=update}
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

    private static final String MIGRACIONES_GLOB = "classpath*:db/migration/V*.sql";

    private static final Pattern NOMBRE_MIGRACION =
        Pattern.compile("^V(\\d+)__.*\\.sql$", Pattern.CASE_INSENSITIVE);

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
            } else if (esPerfilProd() && esPostgres(flyway) && esquemaPublicoVacio(flyway)) {
                if (bootstrapProdHabilitado()) {
                    bootstrapProdVacio(flyway);
                } else {
                    abortarProdVacio();
                }
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

    private boolean esPerfilProd() {
        List<String> perfiles = Arrays.asList(environment.getActiveProfiles());
        return perfiles.contains("prod") || perfiles.contains("production");
    }

    /** PROPUESTA: opt-in explícito; por defecto prod sigue abortando con base vacía. */
    static final String PROP_BOOTSTRAP_PROD = "hotclick.flyway.bootstrap-vacio";

    static final String BOOTSTRAP_LOCATION = "classpath:db/bootstrap";

    static final String BOOTSTRAP_HISTORIAL = "flyway_bootstrap_history";

    static final String BOOTSTRAP_SQL = "db/bootstrap/V1__esquema_base_consolidado.sql";

    private static final Pattern VERSION_BOOTSTRAP =
        Pattern.compile("^-- hotclick\\.bootstrap\\.version=(\\d+)\\s*$", Pattern.MULTILINE);

    private boolean bootstrapProdHabilitado() {
        return environment.getProperty(PROP_BOOTSTRAP_PROD, Boolean.class, false);
    }

    /**
     * PROPUESTA (decisión pendiente del dueño). Base vacía + prod + opt-in:
     * aplica el esquema base consolidado (generado por
     * scripts/flyway/generar-esquema-base.sh) con su propio historial Flyway,
     * y hace baseline del historial principal en la versión que declara ese
     * archivo. migrate() luego solo aplica migraciones posteriores.
     * Una base de prod existente nunca entra aquí (no está vacía).
     */
    private void bootstrapProdVacio(Flyway flyway) {
        int versionArchivo = versionBootstrap(leerClasspath(BOOTSTRAP_SQL));
        int ultima = ultimaVersionMigracion(nombresMigracionesClasspath());
        if (versionArchivo > ultima) {
            throw new IllegalStateException("[flyway] El esquema base declara V" + versionArchivo
                + " pero la última migración del classpath es V" + ultima + ". Regeneralo.");
        }
        log.warn("[flyway] Base vacía + perfil prod + {}=true: aplicando esquema base hasta V{}",
            PROP_BOOTSTRAP_PROD, versionArchivo);
        Flyway.configure()
            .configuration(flyway.getConfiguration())
            .locations(BOOTSTRAP_LOCATION)
            .table(BOOTSTRAP_HISTORIAL)
            .baselineOnMigrate(false)
            .load()
            .migrate();
        Flyway.configure()
            .configuration(flyway.getConfiguration())
            .baselineVersion(String.valueOf(versionArchivo))
            .baselineDescription("Esquema base consolidado hasta V" + versionArchivo)
            .load()
            .baseline();
    }

    static int versionBootstrap(String sql) {
        Matcher m = VERSION_BOOTSTRAP.matcher(sql == null ? "" : sql);
        if (!m.find()) {
            throw new IllegalStateException("[flyway] " + BOOTSTRAP_SQL
                + " no declara '-- hotclick.bootstrap.version=N'");
        }
        return Integer.parseInt(m.group(1));
    }

    private static String leerClasspath(String location) {
        ClassPathResource resource = new ClassPathResource(location);
        if (!resource.exists()) {
            throw new IllegalStateException("[flyway] Falta recurso " + location);
        }
        try (BufferedReader reader = new BufferedReader(
                 new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (IOException e) {
            throw new IllegalStateException("[flyway] No se pudo leer " + location, e);
        }
    }

    private static boolean esPostgres(Flyway flyway) {
        try (Connection c = flyway.getConfiguration().getDataSource().getConnection()) {
            return c.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT).contains("postgres");
        } catch (SQLException e) {
            throw new IllegalStateException("[flyway] No se pudo leer el motor de la base", e);
        }
    }

    /**
     * Base vacía + perfil prod: V1 (dump legacy) no es reproducible en cadena
     * (mezcla "HOT_CLICK_PRODUCTO_TB" entre comillas con hot_click_producto_tb
     * sin comillas → 'relation hot_click_producto_tb does not exist'). No se
     * reescribe V1 porque ya corrió en prod (cambiaría el checksum). Se aborta
     * con un mensaje claro en vez de dejar una migración V1 FAILED.
     */
    static void abortarProdVacio() {
        throw new IllegalStateException(
            "[flyway] Perfil prod contra una base VACÍA: V1..VN no se pueden rejugar en cadena "
                + "(V1 es el dump legacy baselinado en prod). No se migra. Para una base nueva, "
                + "restaurá un respaldo de producción o usá el perfil dev (baseline + Hibernate) "
                + "en un entorno local. Ver docs del hallazgo Flyway V1.");
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
     * Base vacía en dev: V1..VN no son reproducibles en cadena (V1 era baseline
     * en prod y choca con V2+). Baseline en la última versión del classpath +
     * tablas nativas; Hibernate update completa el esquema de entidades.
     * Así migrate() no ejecuta V137+ sobre tablas que aún no existen.
     */
    private void bootstrapDevVacio(Flyway flyway) {
        int ultima = ultimaVersionMigracion(nombresMigracionesClasspath());
        log.warn(
            "[flyway] Base vacía + perfil dev: baseline en V{} sin rejugár V1..V{} "
                + "(historial legacy). Hibernate ddl-auto=update arma el esquema.",
            ultima, ultima
        );
        ejecutarSqlClasspath(flyway, NATIVAS_DEV);
        Flyway baseliner = Flyway.configure()
            .configuration(flyway.getConfiguration())
            .baselineVersion(String.valueOf(ultima))
            .baselineDescription(
                "Dev empty-DB bootstrap (through V" + ultima + "; V1-" + ultima + " not replayable)")
            .load();
        baseliner.baseline();
        log.info(
            "[flyway] Baseline dev aplicado en V{}. migrate() no rejuega scripts ya baselinados.",
            ultima
        );
    }

    /**
     * Mayor {@code N} en nombres {@code V{N}__*.sql}. Ignora otros archivos.
     * Compara como entero ({@code V13} &lt; {@code V136} &lt; {@code V140}).
     */
    static int ultimaVersionMigracion(Iterable<String> nombres) {
        int max = -1;
        for (String nombre : nombres) {
            Integer version = versionDesdeNombre(nombre);
            if (version != null && version > max) {
                max = version;
            }
        }
        if (max < 0) {
            throw new IllegalStateException(
                "[flyway] No hay migraciones V{N}__*.sql en el classpath para baselinar"
            );
        }
        return max;
    }

    static Integer versionDesdeNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return null;
        }
        String base = nombre;
        int slash = Math.max(nombre.lastIndexOf('/'), nombre.lastIndexOf('\\'));
        if (slash >= 0) {
            base = nombre.substring(slash + 1);
        }
        Matcher m = NOMBRE_MIGRACION.matcher(base);
        if (!m.matches()) {
            return null;
        }
        return Integer.parseInt(m.group(1));
    }

    private static List<String> nombresMigracionesClasspath() {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources(MIGRACIONES_GLOB);
            return Arrays.stream(resources)
                .map(Resource::getFilename)
                .filter(Objects::nonNull)
                .toList();
        } catch (IOException e) {
            throw new IllegalStateException("[flyway] No se pudo listar " + MIGRACIONES_GLOB, e);
        }
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
