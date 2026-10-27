package com.hotclick.repository;

import com.hotclick.model.Empresa;
import com.hotclick.service.CupoEmprendedorService;
import com.hotclick.service.CupoEmprendedorService.ResultadoReserva;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.Mockito;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Cupo Emprendedor con semántica real de PostgreSQL: aplica el archivo REAL {@code V207__…sql} (UNIQUE de titular y
 * trigger de liberación al borrar) y corre {@link CupoEmprendedorService} con conexiones concurrentes. En H2 el trigger
 * (PL/pgSQL) no existe y el aborto de transacción por violación de UNIQUE no se parece al de PG.
 *
 * <p>Opt-in como {@code WalletUpsertPostgresTest}: {@code HC_PG_TEST_URL=jdbc:postgresql://127.0.0.1:55432/db?user=…}
 * (sin Docker/Testcontainers offline). Usa un schema temporal propio ({@code currentSchema}) y lo borra al terminar.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("Cupo Emprendedor en PostgreSQL: V207, trigger de liberación y concurrencia")
class CupoEmprendedorPostgresTest {

    private static final String SCHEMA = "hc_cupo_emprendedor_test";

    private DriverManagerDataSource ds;
    private JdbcTemplate jdbc;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() throws Exception {
        String base = System.getenv("HC_PG_TEST_URL");
        DriverManagerDataSource admin = new DriverManagerDataSource(base);
        new JdbcTemplate(admin).execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        new JdbcTemplate(admin).execute("CREATE SCHEMA " + SCHEMA);
        ds = new DriverManagerDataSource(base + (base.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        jdbc = new JdbcTemplate(ds);
        tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        // Tablas como las dejan V206 (columnas del trial) y el contador (V206); sin las FK del resto del modelo.
        jdbc.execute("CREATE TABLE hot_click_cupo_emprendedor_tb (id SMALLINT PRIMARY KEY, "
            + "limite INTEGER NOT NULL DEFAULT 70, usados INTEGER NOT NULL DEFAULT 0)");
        jdbc.update("INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados) VALUES (1, 70, 0)");
        jdbc.execute("CREATE TABLE hot_click_empresa_tb (id_empresa BIGINT PRIMARY KEY, "
            + "estado_plan VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE_CUPO', visibilidad_publica BOOLEAN NOT NULL DEFAULT FALSE, "
            + "trial_hasta DATE, fecha_venc_plan DATE, trial_emprendedor_hasta DATE, trial_emprendedor_pos INTEGER)");
        jdbc.execute("CREATE UNIQUE INDEX uq_empresa_trial_emprendedor_pos ON hot_click_empresa_tb (trial_emprendedor_pos)");
        aplicarV207();
    }

    @AfterEach
    void tearDown() {
        new JdbcTemplate(new DriverManagerDataSource(System.getenv("HC_PG_TEST_URL")))
            .execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    /** El archivo real de Flyway, sin comentarios previos que el driver no necesite (lo ejecuta tal cual). */
    private void aplicarV207() throws IOException {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V207__cupo_emprendedor_un_puesto_por_persona.sql"));
        jdbc.execute((Connection c) -> {
            try (Statement st = c.createStatement()) {
                st.execute(sql);
            }
            return null;
        });
    }

    private CupoEmprendedorService servicio(int cupo) {
        return new CupoEmprendedorService(jdbc, Mockito.mock(PlanRepository.class), new TrialEmprendedorConfig(cupo, 90));
    }

    private Empresa empresa(long id) {
        jdbc.update("INSERT INTO hot_click_empresa_tb (id_empresa) VALUES (?)", id);
        Empresa e = new Empresa();
        e.setId(id);
        return e;
    }

    private int usados() {
        return jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class);
    }

    private <T> List<T> simultaneas(List<Callable<T>> tareas) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(tareas.size());
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<T>> futuros = new ArrayList<>();
        for (Callable<T> t : tareas) futuros.add(pool.submit(() -> { salida.await(); return t.call(); }));
        salida.countDown();
        List<T> out = new ArrayList<>();
        for (Future<T> f : futuros) out.add(f.get(120, TimeUnit.SECONDS));
        pool.shutdownNow();
        return out;
    }

    private ResultadoReserva reservar(CupoEmprendedorService s, Empresa e, long usuario, String correo) {
        return tx.execute(st -> s.reservarPuesto(e, usuario, correo));
    }

    @Test
    @DisplayName("V207 es idempotente: aplicarla otra vez no falla")
    void v207Idempotente() throws Exception {
        aplicarV207();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_cupo_emprendedor_liberar_al_borrar'",
            Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("UNIQUE: la BD rechaza el mismo titular (usuario o correo) en dos empresas y admite varios NULL")
    void uniqueDeTitular() {
        empresa(1);
        empresa(2);
        empresa(3);
        jdbc.update("UPDATE hot_click_empresa_tb SET trial_emprendedor_titular_usuario = 5, "
            + "trial_emprendedor_titular_correo = 'x@correo.com' WHERE id_empresa = 1");
        assertThatThrownBy(() -> jdbc.update("UPDATE hot_click_empresa_tb SET trial_emprendedor_titular_usuario = 5 "
            + "WHERE id_empresa = 2")).isInstanceOf(DuplicateKeyException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE hot_click_empresa_tb SET trial_emprendedor_titular_correo = 'x@correo.com' "
            + "WHERE id_empresa = 2")).isInstanceOf(DuplicateKeyException.class);
        // empresas 2 y 3 siguen con NULL y conviven
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_empresa_tb "
            + "WHERE trial_emprendedor_titular_usuario IS NULL", Integer.class)).isEqualTo(2);
    }

    @Test
    @DisplayName("Trigger: borrar un negocio en TRIAL con puesto devuelve el puesto; nunca baja de 0")
    void triggerLiberaAlBorrar() {
        CupoEmprendedorService s = servicio(70);
        Empresa e1 = empresa(1), e2 = empresa(2);
        reservar(s, e1, 1, "a@correo.com");
        reservar(s, e2, 2, "b@correo.com");
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'TRIAL'");
        assertThat(usados()).isEqualTo(2);

        jdbc.update("DELETE FROM hot_click_empresa_tb WHERE id_empresa = 1");
        assertThat(usados()).isEqualTo(1);

        // contador desfasado en 0: borrar otro con puesto no lo deja en -1
        jdbc.update("UPDATE hot_click_cupo_emprendedor_tb SET usados = 0");
        jdbc.update("DELETE FROM hot_click_empresa_tb WHERE id_empresa = 2");
        assertThat(usados()).isZero();
    }

    @Test
    @DisplayName("Trigger: borrar una empresa sin puesto, o que ya pagó, no toca el contador")
    void triggerNoLiberaSinPuesto() {
        CupoEmprendedorService s = servicio(70);
        empresa(1);
        Empresa pagada = empresa(2);
        reservar(s, pagada, 2, "b@correo.com");
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'ACTIVO' WHERE id_empresa = 2");

        jdbc.update("DELETE FROM hot_click_empresa_tb WHERE id_empresa IN (1, 2)");

        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("Liberar tras un rechazo en PG: baja 1, no hay doble liberación y el puesto se reutiliza")
    void liberarYReutilizar() throws Exception {
        CupoEmprendedorService s = servicio(2);
        Empresa e1 = empresa(1), e2 = empresa(2), e3 = empresa(3);
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'TRIAL' WHERE id_empresa IN (1, 2)");
        reservar(s, e1, 1, "a@correo.com");
        reservar(s, e2, 2, "b@correo.com");
        assertThat(reservar(s, e3, 3, "c@correo.com")).isEqualTo(ResultadoReserva.SIN_CUPO);

        List<Boolean> res = simultaneas(List.of(
            () -> Boolean.TRUE.equals(tx.execute(st -> s.liberarPuesto(e1))),
            () -> Boolean.TRUE.equals(tx.execute(st -> s.liberarPuesto(e1)))));

        assertThat(res).containsExactlyInAnyOrder(true, false);
        assertThat(usados()).isEqualTo(1);
        assertThat(reservar(s, e3, 3, "c@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        assertThat(e3.getTrialEmprendedorPos()).isEqualTo(1);
        assertThat(usados()).isEqualTo(2);
    }

    @Test
    @DisplayName("Concurrencia real: la misma persona con 2 negocios a la vez recibe 1 puesto (30 rondas) sin abortar transacciones")
    void mismaPersonaDosNegociosEnPg() throws Exception {
        CupoEmprendedorService s = servicio(70);
        for (int ronda = 0; ronda < 30; ronda++) {
            Empresa a = empresa(1000L + ronda * 2), b = empresa(1001L + ronda * 2);
            long persona = 9000L + ronda;
            String correo = "dueno" + ronda + "@correo.com";
            List<ResultadoReserva> res = simultaneas(List.of(
                () -> reservar(s, a, persona, correo), () -> reservar(s, b, persona, correo)));
            assertThat(res).containsExactlyInAnyOrder(ResultadoReserva.ASIGNADO, ResultadoReserva.PERSONA_YA_TIENE_PUESTO);
        }
        assertThat(usados()).isEqualTo(30);
    }

    @Test
    @DisplayName("Concurrencia real: 100 personas con cupo 70 reciben exactamente 70 puestos, 1..70 sin repetir")
    void cienPersonasSetentaPuestosEnPg() throws Exception {
        CupoEmprendedorService s = servicio(70);
        List<Callable<ResultadoReserva>> tareas = new ArrayList<>();
        for (int i = 1; i <= 100; i++) {
            Empresa e = empresa(i);
            long persona = i;
            tareas.add(() -> reservar(s, e, persona, "p" + persona + "@correo.com"));
        }
        List<ResultadoReserva> res = simultaneas(tareas);

        assertThat(res.stream().filter(r -> r == ResultadoReserva.ASIGNADO).count()).isEqualTo(70);
        assertThat(jdbc.queryForList("SELECT trial_emprendedor_pos FROM hot_click_empresa_tb "
            + "WHERE trial_emprendedor_pos IS NOT NULL ORDER BY 1", Integer.class))
            .containsExactlyElementsOf(java.util.stream.IntStream.rangeClosed(1, 70).boxed().toList());
        assertThat(usados()).isEqualTo(70);
    }
}
