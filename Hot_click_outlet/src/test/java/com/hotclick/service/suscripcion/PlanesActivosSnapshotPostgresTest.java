package com.hotclick.service.suscripcion;

import com.hotclick.controller.SuscripcionController;
import com.hotclick.controller.TenantController;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.TenantService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.prueba.PruebaPlanService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Postgres REAL (HC_PG_TEST_URL, el Postgres de servicio del job de CI; nunca QA ni producción): el lector compartido
 * de /api/planes y /api/billing/planes lee todas las páginas sobre el snapshot inicial (REPEATABLE READ por
 * {@code SET TRANSACTION}) aunque, tras la primera página, otro proceso confirme un alta, una baja y cambios de
 * precio que moverían filas entre páginas. Sin la variable el test NO corre (queda SKIPPED, no es evidencia).
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DataJpaTest(properties = {
    "spring.flyway.enabled=false",
    "spring.sql.init.mode=never",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
    "spring.datasource.driver-class-name=org.postgresql.Driver"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PlanesActivosLector.class, SnapshotLecturaPg.class, PlanesLectorGancho.class,
    PlanesActivosSnapshotPostgresTest.PgDataSource.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@DisplayName("Postgres: snapshot REPEATABLE READ del lector de planes entre páginas, ambos endpoints")
class PlanesActivosSnapshotPostgresTest {

    private static final String SCHEMA = "hc_planes_snapshot";
    private static final int SEMBRADOS = 1200;

    private static String base() { return System.getenv("HC_PG_TEST_URL"); }

    private static String conSchema() {
        return base() + (base().contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA;
    }

    /** DataSource del test (la URL de HC_PG_TEST_URL ya trae credenciales; no se usan DB_URL/DB_USERNAME). */
    @org.springframework.boot.test.context.TestConfiguration
    static class PgDataSource {
        @org.springframework.context.annotation.Bean
        DataSource dataSource() {
            com.zaxxer.hikari.HikariDataSource ds = new com.zaxxer.hikari.HikariDataSource();
            ds.setJdbcUrl(conSchema());
            ds.setMaximumPoolSize(3);
            return ds;
        }
    }

    @BeforeAll
    static void esquema() {
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(base()));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        new JdbcTemplate(new DriverManagerDataSource(conSchema())).execute("""
            CREATE TABLE hot_click_plan_tb (
                id_plan BIGSERIAL PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL UNIQUE,
                descripcion VARCHAR(255),
                precio_mensual INTEGER NOT NULL,
                max_usuarios INTEGER NOT NULL DEFAULT 2,
                max_productos INTEGER NOT NULL DEFAULT 50,
                max_bodegas INTEGER NOT NULL DEFAULT 1,
                max_cajas INTEGER NOT NULL DEFAULT 1,
                tiene_pos BOOLEAN NOT NULL DEFAULT FALSE,
                tiene_crm BOOLEAN NOT NULL DEFAULT FALSE,
                tiene_compras BOOLEAN NOT NULL DEFAULT FALSE,
                tiene_reportes BOOLEAN NOT NULL DEFAULT FALSE,
                tiene_ai BOOLEAN NOT NULL DEFAULT FALSE,
                tiene_api BOOLEAN NOT NULL DEFAULT FALSE,
                tiene_gift_cards BOOLEAN NOT NULL DEFAULT FALSE,
                activo BOOLEAN NOT NULL DEFAULT TRUE,
                max_creditos_ai INTEGER NOT NULL DEFAULT 0,
                precio_usd NUMERIC(8,2) NOT NULL DEFAULT 0,
                comision_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
                comision_minima_crc INTEGER NOT NULL DEFAULT 0)
            """);
    }

    @AfterAll
    static void borrarEsquema() {
        new JdbcTemplate(new DriverManagerDataSource(base())).execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    @Autowired PlanesActivosLector lector;
    @Autowired @Qualifier("planRepository") PlanRepository repoReal;
    /** El @Primary de PlanesLectorGancho: el mismo que usa el lector; dispara la barrera tras cada página. */
    @Autowired PlanRepository repoConGancho;
    @Autowired SnapshotLecturaPg snapshot;
    @Autowired PlatformTransactionManager txManager;
    @Autowired DataSource dataSource;

    /** Escritor: conexión propia (autocommit), fuera del pool de Spring. */
    private final JdbcTemplate escritor = new JdbcTemplate(new DriverManagerDataSource(conSchema()));

    private long idBajoAMover;
    private long idAltoAMover;
    private long idADesactivar;

    @BeforeEach
    void sembrar() {
        PlanesLectorGancho.TRAS_PAGINA.set(n -> { });
        escritor.execute("TRUNCATE hot_click_plan_tb RESTART IDENTITY");
        escritor.update("INSERT INTO hot_click_plan_tb (nombre, precio_mensual) VALUES "
            + "('EMPRENDEDOR', 0), ('PYME', 12900), ('pyme', 12900), ('Negocio_Plus', 28900)");
        escritor.update("INSERT INTO hot_click_plan_tb (nombre, precio_mensual) "
            + "SELECT 'Legado ' || g, 1000 + (g % 40) * 100 FROM generate_series(1, " + SEMBRADOS + ") g");
        escritor.update("INSERT INTO hot_click_plan_tb (nombre, precio_mensual, activo) VALUES ('FREE', 0, false)");
        // Filas que el escritor mueve: una del principio que pasa al final (duplicado en READ COMMITTED) y una del
        // final que pasa al principio (faltante en READ COMMITTED); y una del final que se desactiva.
        idBajoAMover = escritor.queryForObject("SELECT id_plan FROM hot_click_plan_tb WHERE nombre = 'Legado 40'", Long.class);
        idAltoAMover = escritor.queryForObject("SELECT id_plan FROM hot_click_plan_tb WHERE nombre = 'Legado 39'", Long.class);
        idADesactivar = escritor.queryForObject("SELECT id_plan FROM hot_click_plan_tb WHERE nombre = 'Legado 1199'", Long.class);
    }

    @AfterEach
    void sinGancho() {
        PlanesLectorGancho.TRAS_PAGINA.set(n -> { });
    }

    private List<Long> idsActivosAhora() {
        return escritor.queryForList("SELECT id_plan FROM hot_click_plan_tb WHERE activo ORDER BY precio_mensual, id_plan",
            Long.class);
    }

    /** Lo observado dentro de la transacción de lectura y lo que el escritor llegó a confirmar. */
    private record Barrera(List<String> aislamiento, List<String> soloLectura, List<Integer> paginas,
                           java.util.concurrent.atomic.AtomicInteger filasEscritas) {
        void escritorCorrio() {
            assertThat(paginas).as("el gancho corrió en cada página (repositorio con gancho)").hasSizeGreaterThan(1)
                .startsWith(0);
            assertThat(filasEscritas.get()).as("alta + baja + 2 cambios de precio confirmados").isEqualTo(4);
        }
    }

    /**
     * Tras la primera página (gancho del PlanRepository @Primary), otro hilo con su propia conexión confirma un alta,
     * una baja y dos cambios de precio; recién entonces el lector sigue (barrera).
     */
    private Barrera barreraConEscritor() {
        JdbcTemplate enTx = new JdbcTemplate(dataSource); // conexión ligada a la transacción en curso
        Barrera b = new Barrera(new ArrayList<>(), new ArrayList<>(), new ArrayList<>(),
            new java.util.concurrent.atomic.AtomicInteger());
        PlanesLectorGancho.TRAS_PAGINA.set(n -> {
            b.paginas().add(n);
            b.aislamiento().add(enTx.queryForObject("SHOW transaction_isolation", String.class));
            b.soloLectura().add(enTx.queryForObject("SHOW transaction_read_only", String.class));
            if (n != 0) return;
            CompletableFuture.runAsync(() -> {
                int f = escritor.update("INSERT INTO hot_click_plan_tb (nombre, precio_mensual) VALUES ('Alta nueva', 500)");
                f += escritor.update("UPDATE hot_click_plan_tb SET activo = false WHERE id_plan = ? AND activo", idADesactivar);
                f += escritor.update("UPDATE hot_click_plan_tb SET precio_mensual = 99999 WHERE id_plan = ?", idBajoAMover);
                f += escritor.update("UPDATE hot_click_plan_tb SET precio_mensual = 1 WHERE id_plan = ?", idAltoAMover);
                b.filasEscritas().set(f);
            }).orTimeout(30, TimeUnit.SECONDS).join();
        });
        return b;
    }

    /** La mutación quedó confirmada en la base (vista desde otra conexión). */
    private void mutacionConfirmada() {
        assertThat(escritor.queryForObject(
            "SELECT count(*) FROM hot_click_plan_tb WHERE nombre = 'Alta nueva' AND activo", Integer.class)).isEqualTo(1);
        assertThat(escritor.queryForObject("SELECT activo FROM hot_click_plan_tb WHERE id_plan = ?", Boolean.class,
            idADesactivar)).isFalse();
        assertThat(escritor.queryForObject("SELECT precio_mensual FROM hot_click_plan_tb WHERE id_plan = ?",
            Integer.class, idBajoAMover)).isEqualTo(99999);
        assertThat(escritor.queryForObject("SELECT precio_mensual FROM hot_click_plan_tb WHERE id_plan = ?",
            Integer.class, idAltoAMover)).isEqualTo(1);
    }

    private Supplier<List<Object>> tenant() {
        TenantController c = new TenantController(mock(TenantService.class), lector, mock(PruebaPlanService.class),
            new PreciosPlanesConfig("9", "24", "49", "usd"));
        return () -> c.planesPublicos().getBody().stream().map(m -> m.get("id")).toList();
    }

    @SuppressWarnings("unchecked")
    private Supplier<List<Object>> billing() {
        // Todos los activos con precio no aplican acá (los Legado no tienen): se mira el conjunto que leyó el lector.
        SuscripcionController c = new SuscripcionController(mock(SuscripcionService.class), repoReal,
            mock(AuthSupport.class), mock(CobroSuscripcionService.class), new PreciosPlanesConfig("9", "24", "49", "usd"),
            mock(PropietarioGuard.class));
        List<List<PlanPublicoVista>> leidos = new ArrayList<>();
        PlanesActivosLector espia = new PlanesActivosLector(null, null) {
            @Override
            public List<PlanPublicoVista> activos(org.springframework.data.domain.Pageable p) {
                List<PlanPublicoVista> out = lector.activos(p); // el proxy real hace la transacción
                leidos.add(out);
                return out;
            }
        };
        ReflectionTestUtils.setField(c, "planesActivos", espia);
        return () -> {
            int status = c.listarPlanes().getStatusCode().value();
            assertThat(status).isEqualTo(409); // los Legado no tienen precio: 409 global de siempre
            return leidos.get(leidos.size() - 1).stream().map(v -> (Object) v.id()).toList();
        };
    }

    private void snapshotSinFaltantesNiDuplicados(Supplier<List<Object>> endpoint) {
        List<Object> inicial = new ArrayList<>(idsActivosAhora());
        assertThat(inicial).hasSize(SEMBRADOS + 4);
        Barrera barrera = barreraConEscritor();

        List<Object> leido = endpoint.get();

        barrera.escritorCorrio();
        mutacionConfirmada();
        assertThat(barrera.paginas()).as("1.204 activos / 50 = 25 páginas").hasSize(25);
        assertThat(barrera.aislamiento()).containsOnly("repeatable read");
        assertThat(barrera.soloLectura()).containsOnly("on");
        assertThat(leido).doesNotHaveDuplicates().containsExactlyElementsOf(inicial);
        // Segunda petición: transacción nueva, ve lo confirmado por el escritor.
        PlanesLectorGancho.TRAS_PAGINA.set(n -> { });
        List<Object> despues = endpoint.get();
        assertThat(despues).doesNotHaveDuplicates().containsExactlyElementsOf(new ArrayList<>(idsActivosAhora()));
        assertThat(despues).isNotEqualTo(inicial).doesNotContain(idADesactivar);
        assertThat(despues.get(1)).as("el plan que bajó a precio 1 queda segundo").isEqualTo(idAltoAMover);
        assertThat(despues.get(despues.size() - 1)).as("el que subió a 99999 queda último").isEqualTo(idBajoAMover);
    }

    @Test
    @DisplayName("GET /api/planes: snapshot inicial completo pese a alta, baja y cambios de precio tras la página 1")
    void tenantSnapshot() {
        snapshotSinFaltantesNiDuplicados(tenant());
    }

    @Test
    @DisplayName("GET /api/billing/planes: mismo snapshot inicial completo (y su 409 global de siempre)")
    void billingSnapshot() {
        snapshotSinFaltantesNiDuplicados(billing());
    }

    @Test
    @DisplayName("Desde una transacción externa READ COMMITTED: el lector igual corre en REPEATABLE READ, en ambos endpoints")
    void desdeTransaccionExternaReadCommitted() {
        for (Supplier<List<Object>> endpoint : List.of(tenant(), billing())) {
            sembrar();
            TransactionTemplate externa = new TransactionTemplate(txManager);
            externa.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
            externa.execute(st -> {
                JdbcTemplate enExterna = new JdbcTemplate(dataSource);
                assertThat(enExterna.queryForObject("SHOW transaction_isolation", String.class)).isEqualTo("read committed");
                List<Object> inicial = new ArrayList<>(idsActivosAhora());
                Barrera barrera = barreraConEscritor();
                List<Object> leido = endpoint.get();
                barrera.escritorCorrio();
                mutacionConfirmada();
                assertThat(barrera.aislamiento()).containsOnly("repeatable read");
                assertThat(barrera.soloLectura()).containsOnly("on");
                assertThat(leido).doesNotHaveDuplicates().containsExactlyElementsOf(inicial);
                // La externa sigue siendo READ COMMITTED (ve lo confirmado por el escritor).
                assertThat(enExterna.queryForObject("SHOW transaction_isolation", String.class)).isEqualTo("read committed");
                assertThat(enExterna.queryForObject("SELECT count(*) FROM hot_click_plan_tb WHERE nombre = 'Alta nueva'",
                    Integer.class)).isEqualTo(1);
                return null;
            });
            PlanesLectorGancho.TRAS_PAGINA.set(n -> { });
        }
    }

    @Test
    @DisplayName("Control: la misma barrera (repositorio con gancho) en READ COMMITTED sí duplica y pierde filas")
    void controlReadCommittedFalla() {
        List<Object> inicial = new ArrayList<>(idsActivosAhora());
        Barrera barrera = barreraConEscritor();
        TransactionTemplate rc = new TransactionTemplate(txManager);
        rc.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        rc.setReadOnly(true);
        List<Object> leido = rc.execute(st -> com.hotclick.utils.PaginasCompletas.todas(repoConGancho::findByActivoTrue,
                PageRequest.of(0, PlanesActivosLector.TAMANO_PAGINA, PlanesActivosLector.ORDEN))
            .stream().map(p -> (Object) p.getId()).toList());

        barrera.escritorCorrio();
        mutacionConfirmada();
        assertThat(barrera.aislamiento()).containsOnly("read committed");
        assertThat(leido).isNotEqualTo(inicial);
        assertThat(java.util.Collections.frequency(leido, idBajoAMover))
            .as("el plan que pasó de la página 1 al final se lee dos veces").isEqualTo(2);
        assertThat(leido).as("el plan que pasó del final a la página 1 ya leída falta").doesNotContain(idAltoAMover);
    }

    @Test
    @DisplayName("Sin SET de sesión (aislamiento ni solo lectura) en el pool; SET TRANSACTION solo vale como primera sentencia")
    void sinSetDeSesion() throws Exception {
        String aislamientoBase = escritor.queryForObject("SHOW default_transaction_isolation", String.class);
        String soloLecturaBase = escritor.queryForObject("SHOW default_transaction_read_only", String.class);
        assertThat(soloLecturaBase).isEqualTo("off");
        for (int i = 0; i < 3; i++) assertThat(tenant().get()).hasSize(SEMBRADOS + 4);
        billing().get();
        List<Connection> cons = new ArrayList<>();
        try {
            for (int i = 0; i < 3; i++) cons.add(dataSource.getConnection()); // todo el pool (máx. 3)
            for (Connection c : cons) {
                assertThat(mostrar(c, "default_transaction_isolation")).isEqualTo(aislamientoBase);
                assertThat(mostrar(c, "transaction_isolation")).isEqualTo(aislamientoBase);
                assertThat(mostrar(c, "default_transaction_read_only")).isEqualTo(soloLecturaBase);
                assertThat(mostrar(c, "transaction_read_only")).isEqualTo("off");
            }
        } finally {
            for (Connection c : cons) c.close();
        }
        // Postgres rechaza SET TRANSACTION ISOLATION LEVEL después de una consulta (SQLSTATE 25001): que el lector
        // lea en REPEATABLE READ (tests de arriba) prueba que el SET fue la primera sentencia de su transacción.
        TransactionTemplate tx = new TransactionTemplate(txManager);
        tx.setReadOnly(true);
        Throwable ex = org.assertj.core.api.Assertions.catchThrowable(() -> tx.executeWithoutResult(st -> {
            new JdbcTemplate(dataSource).queryForObject("SELECT 1", Integer.class);
            snapshot.exigirRepeatableRead();
        }));
        assertThat(ex).isNotNull();
        Throwable raiz = ex;
        while (raiz.getCause() != null && !(raiz instanceof java.sql.SQLException)) raiz = raiz.getCause();
        assertThat(raiz).isInstanceOf(java.sql.SQLException.class);
        assertThat(((java.sql.SQLException) raiz).getSQLState()).isEqualTo("25001");
    }

    private static String mostrar(Connection c, String parametro) throws java.sql.SQLException {
        try (var st = c.createStatement(); var rs = st.executeQuery("SHOW " + parametro)) {
            rs.next();
            return rs.getString(1);
        }
    }
}
