package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.CupoEmprendedorService.ResultadoReserva;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Cupo del trial Emprendedor contra una BD real (H2 en modo PostgreSQL), con operaciones simultáneas:
 * nunca más puestos que el cupo, un solo puesto por persona aunque aprueben dos negocios a la vez, y la liberación
 * (rechazo) devuelve el puesto una sola vez y nunca deja el contador bajo 0.
 */
@DisplayName("Cupo trial Emprendedor: concurrencia, una persona un puesto y liberación")
class CupoEmprendedorConcurrenciaTest {

    private JdbcTemplate jdbc;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource ds = new DriverManagerDataSource(
            "jdbc:h2:mem:cupo_" + System.nanoTime() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=20000",
            "sa", "");
        jdbc = new JdbcTemplate(ds);
        tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        jdbc.execute("CREATE TABLE hot_click_cupo_emprendedor_tb (id SMALLINT PRIMARY KEY, "
            + "limite INTEGER NOT NULL DEFAULT 70, usados INTEGER NOT NULL DEFAULT 0)");
        jdbc.update("INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados) VALUES (1, 70, 0)");
        // Columnas y UNIQUE tal como los dejan V206 y V207 en hot_click_empresa_tb.
        jdbc.execute("CREATE TABLE hot_click_empresa_tb (id_empresa BIGINT PRIMARY KEY, "
            + "estado_plan VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE_CUPO', visibilidad_publica BOOLEAN NOT NULL DEFAULT FALSE, "
            + "trial_hasta DATE, fecha_venc_plan DATE, trial_emprendedor_hasta DATE, "
            + "trial_emprendedor_pos INTEGER, trial_emprendedor_titular_usuario BIGINT, "
            + "trial_emprendedor_titular_correo VARCHAR(160))");
        jdbc.execute("CREATE UNIQUE INDEX uq_pos ON hot_click_empresa_tb (trial_emprendedor_pos)");
        jdbc.execute("CREATE UNIQUE INDEX uq_titular_usuario ON hot_click_empresa_tb (trial_emprendedor_titular_usuario)");
        jdbc.execute("CREATE UNIQUE INDEX uq_titular_correo ON hot_click_empresa_tb (trial_emprendedor_titular_correo)");
    }

    @AfterEach
    void tearDown() {
        jdbc.execute("DROP ALL OBJECTS");
    }

    private CupoEmprendedorService servicio(int cupo) {
        return new CupoEmprendedorService(jdbc, Mockito.mock(PlanRepository.class),
            new TrialEmprendedorConfig(cupo, 90));
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

    private boolean libera(CupoEmprendedorService s, Empresa e) {
        return Boolean.TRUE.equals(tx.execute(st -> s.liberarPuesto(e)));
    }

    private ResultadoReserva reservar(CupoEmprendedorService s, Empresa e, long usuario, String correo) {
        return tx.execute(st -> s.reservarPuesto(e, usuario, correo));
    }

    /** Ejecuta las tareas a la vez (compuerta común) y devuelve sus resultados en orden. */
    private <T> List<T> simultaneas(List<Callable<T>> tareas) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(tareas.size());
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<T>> futuros = new ArrayList<>();
        for (Callable<T> t : tareas) {
            futuros.add(pool.submit(() -> {
                salida.await();
                return t.call();
            }));
        }
        salida.countDown();
        List<T> out = new ArrayList<>();
        for (Future<T> f : futuros) out.add(f.get(60, TimeUnit.SECONDS));
        pool.shutdownNow();
        return out;
    }

    // ── cupo ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("100 aprobaciones simultáneas de 100 personas con cupo 70: exactamente 70 puestos, 1..70 sin repetir")
    void nuncaMasDeSetentaConAprobacionesSimultaneas() throws Exception {
        CupoEmprendedorService s = servicio(70);
        List<Callable<ResultadoReserva>> tareas = new ArrayList<>();
        for (int i = 1; i <= 100; i++) {
            Empresa e = empresa(i);
            long persona = i;
            tareas.add(() -> reservar(s, e, persona, "persona" + persona + "@correo.com"));
        }
        List<ResultadoReserva> res = simultaneas(tareas);

        assertThat(res.stream().filter(r -> r == ResultadoReserva.ASIGNADO).count()).isEqualTo(70);
        assertThat(res.stream().filter(r -> r == ResultadoReserva.SIN_CUPO).count()).isEqualTo(30);
        List<Integer> puestos = jdbc.queryForList(
            "SELECT trial_emprendedor_pos FROM hot_click_empresa_tb WHERE trial_emprendedor_pos IS NOT NULL ORDER BY 1",
            Integer.class);
        assertThat(puestos).doesNotHaveDuplicates().hasSize(70);
        assertThat(puestos.get(0)).isEqualTo(1);
        assertThat(puestos.get(69)).isEqualTo(70);
        assertThat(usados()).isEqualTo(70);
    }

    @Test
    @DisplayName("El negocio 71 no recibe puesto (secuencial) y el tope sale de la configuración")
    void elSetentaYunoNoRecibePuesto() {
        CupoEmprendedorService s = servicio(3);
        for (int i = 1; i <= 3; i++) {
            assertThat(reservar(s, empresa(i), i, "p" + i + "@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        }
        assertThat(reservar(s, empresa(4), 4, "p4@correo.com")).isEqualTo(ResultadoReserva.SIN_CUPO);
        assertThat(usados()).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT limite FROM hot_click_cupo_emprendedor_tb", Integer.class)).isEqualTo(3);
    }

    @Test
    @DisplayName("Rollback de la aprobación devuelve el puesto")
    void rollbackDevuelveElPuesto() {
        CupoEmprendedorService s = servicio(2);
        Empresa e = empresa(1);
        tx.execute(st -> {
            assertThat(s.reservarPuesto(e, 1L, "p1@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
            st.setRollbackOnly();
            return null;
        });
        assertThat(usados()).isZero();
        assertThat(jdbc.queryForObject("SELECT trial_emprendedor_pos FROM hot_click_empresa_tb WHERE id_empresa = 1",
            Integer.class)).isNull();
    }

    @Test
    @DisplayName("Fail-closed: sin tabla de cupo no hay puesto")
    void sinTablaNoHayPuesto() {
        jdbc.execute("DROP TABLE hot_click_cupo_emprendedor_tb");
        assertThat(reservar(servicio(70), empresa(1), 1, "p1@correo.com")).isEqualTo(ResultadoReserva.SIN_CUPO);
    }

    // ── una persona, un puesto ────────────────────────────────────────────────

    @Test
    @DisplayName("La misma persona con 2 negocios aprobados a la vez recibe 1 solo puesto (20 rondas)")
    void mismaPersonaDosNegociosSimultaneosUnSoloPuesto() throws Exception {
        CupoEmprendedorService s = servicio(70);
        for (int ronda = 0; ronda < 20; ronda++) {
            long a = 1000L + ronda * 2, b = a + 1;
            Empresa ea = empresa(a), eb = empresa(b);
            long persona = 50_000L + ronda;
            String correo = "dueno" + ronda + "@correo.com";
            List<ResultadoReserva> res = simultaneas(List.of(
                () -> reservar(s, ea, persona, correo),
                () -> reservar(s, eb, persona, correo)));

            assertThat(res).containsExactlyInAnyOrder(ResultadoReserva.ASIGNADO, ResultadoReserva.PERSONA_YA_TIENE_PUESTO);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_empresa_tb "
                + "WHERE trial_emprendedor_titular_usuario = ?", Integer.class, persona)).isEqualTo(1);
        }
        assertThat(usados()).isEqualTo(20);
    }

    @Test
    @DisplayName("Mismo correo (con alias +tag o puntos de Gmail) con usuarios distintos: 1 solo puesto")
    void mismoCorreoNormalizadoUsuariosDistintos() {
        CupoEmprendedorService s = servicio(70);
        String c1 = CupoEmprendedorAprobacionService.normalizarCorreo("Mi.Dueno+tienda1@Gmail.com");
        String c2 = CupoEmprendedorAprobacionService.normalizarCorreo("midueno@googlemail.com");
        assertThat(c1).isEqualTo("midueno@gmail.com").isEqualTo(c2);

        assertThat(reservar(s, empresa(1), 1, c1)).isEqualTo(ResultadoReserva.ASIGNADO);
        assertThat(reservar(s, empresa(2), 2, c2)).isEqualTo(ResultadoReserva.PERSONA_YA_TIENE_PUESTO);
        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("Mismo usuario con correos distintos: 1 solo puesto")
    void mismoUsuarioCorreosDistintos() {
        CupoEmprendedorService s = servicio(70);
        assertThat(reservar(s, empresa(1), 7, "a@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        assertThat(reservar(s, empresa(2), 7, "b@correo.com")).isEqualTo(ResultadoReserva.PERSONA_YA_TIENE_PUESTO);
        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("Quien ya tenía puesto y vuelve a aprobar el mismo negocio no consume otro (idempotente por empresa)")
    void mismoNegocioNoDuplica() {
        CupoEmprendedorService s = servicio(70);
        Empresa e = empresa(1);
        assertThat(reservar(s, e, 7, "a@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        // Segunda llamada con la misma empresa (ya trae puesto): reutiliza el puesto, el contador no sube.
        assertThat(reservar(s, e, 7, "a@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("Red de seguridad: el UNIQUE de la BD rechaza un segundo puesto de la misma persona aunque el código falle")
    void uniqueDeLaBdEsLaUltimaDefensa() {
        empresa(1);
        empresa(2);
        jdbc.update("UPDATE hot_click_empresa_tb SET trial_emprendedor_titular_correo = 'x@correo.com', "
            + "trial_emprendedor_titular_usuario = 5 WHERE id_empresa = 1");
        assertThatThrownBy(() -> jdbc.update("UPDATE hot_click_empresa_tb SET trial_emprendedor_titular_correo = 'x@correo.com' "
            + "WHERE id_empresa = 2")).isInstanceOf(DuplicateKeyException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE hot_click_empresa_tb SET trial_emprendedor_titular_usuario = 5 "
            + "WHERE id_empresa = 2")).isInstanceOf(DuplicateKeyException.class);
    }

    // ── liberación ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Rechazo libera el puesto: el contador baja 1, la empresa vuelve a PENDIENTE_CUPO y otra persona lo toma")
    void rechazoLiberaYOtroLoToma() {
        CupoEmprendedorService s = servicio(2);
        Empresa e1 = empresa(1), e2 = empresa(2), e3 = empresa(3);
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'TRIAL' WHERE id_empresa IN (1, 2)");
        assertThat(reservar(s, e1, 1, "a@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        assertThat(reservar(s, e2, 2, "b@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        assertThat(reservar(s, e3, 3, "c@correo.com")).isEqualTo(ResultadoReserva.SIN_CUPO);

        assertThat(libera(s, e1)).isTrue();

        assertThat(usados()).isEqualTo(1);
        assertThat(e1.getTrialEmprendedorPos()).isNull();
        assertThat(e1.getTrialEmprendedorTitularCorreo()).isNull();
        assertThat(e1.getEstadoPlan()).isEqualTo("PENDIENTE_CUPO");
        assertThat(jdbc.queryForObject("SELECT trial_emprendedor_titular_usuario FROM hot_click_empresa_tb "
            + "WHERE id_empresa = 1", Long.class)).isNull();
        // El puesto liberado (el 1) se reutiliza y el índice UNIQUE de puestos no se viola.
        assertThat(reservar(s, e3, 3, "c@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        assertThat(e3.getTrialEmprendedorPos()).isEqualTo(1);
        assertThat(usados()).isEqualTo(2);
    }

    @Test
    @DisplayName("Sin doble liberación: liberar dos veces (o dos hilos a la vez) devuelve el puesto una sola vez")
    void sinDobleLiberacion() throws Exception {
        CupoEmprendedorService s = servicio(70);
        Empresa e1 = empresa(1), e2 = empresa(2);
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'TRIAL'");
        reservar(s, e1, 1, "a@correo.com");
        reservar(s, e2, 2, "b@correo.com");
        assertThat(usados()).isEqualTo(2);

        List<Boolean> res = simultaneas(List.of(
            () -> libera(s, e1),
            () -> libera(s, e1)));

        assertThat(res).containsExactlyInAnyOrder(true, false);
        assertThat(usados()).isEqualTo(1); // el de e2 sigue ocupado
        assertThat(libera(s, e1)).isFalse();
        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("El contador nunca baja de 0 aunque esté desfasado")
    void nuncaBajoCero() {
        CupoEmprendedorService s = servicio(70);
        Empresa e = empresa(1);
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'TRIAL', trial_emprendedor_pos = 1 WHERE id_empresa = 1");
        e.setTrialEmprendedorPos(1);
        assertThat(usados()).isZero();

        assertThat(libera(s, e)).isTrue();

        assertThat(usados()).isZero();
    }

    @Test
    @DisplayName("Una empresa sin puesto, o que ya pagó/venció, no libera nada")
    void sinPuestoOYaPagoNoLibera() {
        CupoEmprendedorService s = servicio(70);
        Empresa sinPuesto = empresa(1);
        assertThat(libera(s, sinPuesto)).isFalse();

        Empresa pagada = empresa(2);
        assertThat(reservar(s, pagada, 2, "b@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'ACTIVO' WHERE id_empresa = 2");
        assertThat(libera(s, pagada)).isFalse();
        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("Puesto heredado del registro anterior sin titular: no se vuelve a descontar; si la persona ya tenía otro, se libera")
    void puestoHeredadoSinTitular() {
        CupoEmprendedorService s = servicio(70);
        Empresa titular = empresa(1);
        assertThat(reservar(s, titular, 9, "a@correo.com")).isEqualTo(ResultadoReserva.ASIGNADO);

        // Empresa 2 reservó puesto 2 en el registro anterior (usados = 2, sin titular).
        Empresa heredada = empresa(2);
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'TRIAL', trial_emprendedor_pos = 2 WHERE id_empresa = 2");
        jdbc.update("UPDATE hot_click_cupo_emprendedor_tb SET usados = 2 WHERE id = 1");
        heredada.setTrialEmprendedorPos(2);

        assertThat(reservar(s, heredada, 9, "a@correo.com")).isEqualTo(ResultadoReserva.PERSONA_YA_TIENE_PUESTO);
        assertThat(usados()).isEqualTo(1);
        assertThat(heredada.getTrialEmprendedorPos()).isNull();
    }
}
