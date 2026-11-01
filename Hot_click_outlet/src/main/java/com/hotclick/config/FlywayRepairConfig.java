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

    static final String PROP_DEV_BOOTSTRAP = "hotclick.flyway.dev-bootstrap";
    static final String PROP_BASE_VACIA = "hotclick.flyway.base-vacia.enabled";
    static final String BASE_VACIA_LOCATION = "classpath:db/base-vacia";
    static final String BASE_VACIA_HISTORIAL = "flyway_base_vacia_history";
    static final String VERSION_ANTES_HOOK = "70";

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
            boolean vacio = esquemaPublicoVacio(flyway);
            if (esPerfilDev() && devBootstrapHabilitado() && vacio) {
                bootstrapDevVacio(flyway);
            } else if (baseVaciaHabilitada() && esPostgres(flyway)) {
                bootstrapBaseVaciaSerializado(flyway);
            } else if (esPerfilProd() && vacio && esPostgres(flyway)) {
                abortarProdVacio();
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

    /**
     * {@code hotclick.flyway.dev-bootstrap} (default {@code true} = comportamiento histórico):
     * con perfil dev y base vacía hace baseline en la última V + Hibernate update.
     * En {@code false} el perfil dev ya no toma ese atajo (útil para rejugar la cadena real).
     */
    boolean devBootstrapHabilitado() {
        return environment.getProperty(PROP_DEV_BOOTSTRAP, Boolean.class, Boolean.TRUE);
    }

    /**
     * {@code hotclick.flyway.base-vacia.enabled} (default {@code false}): con el esquema public
     * VACÍO aplica db/base-vacia (equivalente a V1 tal como quedó en prod), baseline V1 y
     * migrate() normal V2..VN. Una base con tablas nunca entra por aquí.
     */
    boolean baseVaciaHabilitada() {
        return environment.getProperty(PROP_BASE_VACIA, Boolean.class, Boolean.FALSE);
    }

    /**
     * Base vacía: el historial principal no puede rejugar V1 (dump legacy), así que se
     * aplica el esquema base con su propio historial y luego la cadena real V2..VN.
     * El hook entre V{@value #VERSION_ANTES_HOOK} y la siguiente reproduce un estado de prod
     * que no sale de ninguna migración (ver hooks/V2__antes_de_V71.sql).
     */
    static void bootstrapBaseVacia(Flyway flyway) {
        log.warn("[flyway] Base vacía + {}=true: esquema base V1 + baseline V1 + migrate V2..VN", PROP_BASE_VACIA);
        verificarExtensionVector(flyway);
        Flyway base = Flyway.configure()
            .configuration(flyway.getConfiguration())
            .locations(BASE_VACIA_LOCATION)
            .table(BASE_VACIA_HISTORIAL)
            .baselineOnMigrate(false)
            .target("1")
            .load();
        base.migrate();
        Flyway.configure()
            .configuration(flyway.getConfiguration())
            .baselineVersion("1")
            .baselineDescription("Esquema base vacía (db/base-vacia, equivalente a V1 en prod)")
            .load()
            .baseline();
        Flyway.configure()
            .configuration(flyway.getConfiguration())
            .target(VERSION_ANTES_HOOK)
            .load()
            .migrate();
        Flyway.configure()
            .configuration(base.getConfiguration())
            .target("latest")
            .load()
            .migrate();
        log.info("[flyway] Base vacía lista hasta V{}; sigue migrate() normal.", VERSION_ANTES_HOOK);
    }

    /** Clave de pg_advisory_lock del camino base-vacía (distinta de la que usa Flyway). */
    static final long BASE_VACIA_LOCK_KEY = 0x48435F4241534556L; // "HC_BASEV"

    /**
     * Dos instancias arrancando a la vez sobre una base vacía: sin serializar, la segunda
     * llegaba a baseline() con el historial ya creado y fallaba. Se abre una transacción en una
     * conexión propia con pg_advisory_xact_lock (sobrevive a PgBouncer en modo transacción: el
     * backend queda fijo hasta el commit) y DENTRO del lock se vuelve a mirar si public sigue
     * vacío: la segunda instancia lo ve con tablas y sigue por el migrate() normal.
     */
    static void bootstrapBaseVaciaSerializado(Flyway flyway) {
        try (Connection c = flyway.getConfiguration().getDataSource().getConnection()) {
            boolean autoCommit = c.getAutoCommit();
            c.setAutoCommit(false);
            try (Statement st = c.createStatement()) {
                st.execute("SELECT pg_advisory_xact_lock(" + BASE_VACIA_LOCK_KEY + ")");
            }
            try {
                if (esquemaPublicoVacio(flyway)) {
                    bootstrapBaseVacia(flyway);
                } else {
                    log.warn("[flyway] {}=true (HOTCLICK_FLYWAY_BASE_VACIA) con una base que NO está vacía: "
                        + "no hace nada, pero quitá la variable del entorno; solo sirve para crear una base nueva.",
                        PROP_BASE_VACIA);
                }
            } finally {
                c.rollback(); // libera el xact lock; la transacción no escribió nada
                c.setAutoCommit(autoCommit);
            }
        } catch (SQLException e) {
            throw new IllegalStateException("[flyway] No se pudo tomar el lock del camino base-vacía", e);
        }
    }

    private boolean esPerfilDev() {
        return Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    private boolean esPerfilProd() {
        List<String> perfiles = Arrays.asList(environment.getActiveProfiles());
        return perfiles.contains("prod") || perfiles.contains("production");
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
                + "restaurá un respaldo de producción, activá hotclick.flyway.base-vacia.enabled=true "
                + "(esquema base + V2..VN) o usá el perfil dev en un entorno local.");
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
        ejecutarSqlClasspath(flyway.getConfiguration().getDataSource(), classpathLocation);
    }

    /** Mismo runner que usa el arranque dev; package-private para poder probarlo contra una base vacía. */
    static void ejecutarSqlClasspath(javax.sql.DataSource dataSource, String classpathLocation) {
        ClassPathResource resource = new ClassPathResource(classpathLocation);
        if (!resource.exists()) {
            throw new IllegalStateException("[flyway] Falta recurso " + classpathLocation);
        }
        try (Connection c = dataSource.getConnection();
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
    /**
     * V62 hace CREATE EXTENSION IF NOT EXISTS vector: con un rol sin superusuario falla a
     * mitad de cadena ("permission denied to create extension vector"). Prerrequisito de la
     * base vacía: un superusuario corre antes CREATE EXTENSION vector en esa base. Se valida
     * aquí, antes de tocar el esquema, para cortar con un mensaje claro.
     */
    static void verificarExtensionVector(Flyway flyway) {
        try (Connection c = flyway.getConfiguration().getDataSource().getConnection();
             Statement st = c.createStatement();
             ResultSet rs = st.executeQuery(
                 "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector'),"
                     + " EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector'),"
                     + " (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)")) {
            rs.next();
            if (rs.getBoolean(1) || rs.getBoolean(3)) {
                return;
            }
            throw new IllegalStateException(rs.getBoolean(2)
                ? "[flyway] Base vacía: falta la extensión vector (V62) y este rol no puede crearla. "
                    + "Un superusuario debe correr antes en esta base: CREATE EXTENSION vector;"
                : "[flyway] Base vacía: pgvector no está instalado en el servidor (V62 lo exige). "
                    + "Instalá pgvector y luego, como superusuario: CREATE EXTENSION vector;");
        } catch (SQLException e) {
            throw new IllegalStateException("[flyway] No se pudo verificar la extensión vector", e);
        }
    }
}
