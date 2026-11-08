package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Excepción QA PYME TEST sobre H2: id, puerta, replay, carrera y error de BD")
class QaAltaPymeTestConcurrenciaTest {

    private static final String FIJO = QaAltaPymeTestService.CORREO_FIXTURE;
    private static final Clock ANTES = Clock.fixed(Instant.parse("2026-11-08T18:00:00Z"), Constants.ZONA_CR);
    private static final Clock DESPUES = Clock.fixed(Instant.parse("2026-12-01T06:00:00Z"), Constants.ZONA_CR);

    private JdbcTemplate jdbc;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource ds = new DriverManagerDataSource(
            "jdbc:h2:mem:qa_alta_" + System.nanoTime() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=20000",
            "sa", "");
        jdbc = new JdbcTemplate(ds);
        tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        jdbc.execute("CREATE TABLE hot_click_qa_alta_pyme_test_tb ("
            + "id SMALLINT PRIMARY KEY, correo_normalizado VARCHAR(160) NOT NULL, plan_destino VARCHAR(30) NOT NULL, "
            + "estado VARCHAR(20) NOT NULL, vence_en TIMESTAMP NOT NULL, consumido_en TIMESTAMP, "
            + "revocado_en TIMESTAMP, empresa_id BIGINT)");
        jdbc.execute("CREATE UNIQUE INDEX uq_qa_alta_pyme_test_correo ON hot_click_qa_alta_pyme_test_tb (correo_normalizado)");
        jdbc.execute("CREATE UNIQUE INDEX uq_qa_alta_pyme_test_empresa ON hot_click_qa_alta_pyme_test_tb (empresa_id)");
    }

    @AfterEach
    void tearDown() {
        jdbc.execute("DROP ALL OBJECTS");
    }

    @Test
    @DisplayName("Tabla vacía: un uso liga solo ese id; otro id con el mismo correo no hereda, y el replay no reabre")
    void unUsoLigadoAlId() {
        QaAltaPymeTestService s = abierta(ANTES);
        assertThat(filas()).isZero();
        assertThat(consumir(s).tomado()).isTrue();
        s.vincular(42L, "QA.SIM.ALTA20261108@hotclick.test");
        assertThat(consumir(s).tomado()).isFalse();
        assertThat(consumir(s).fallo()).isFalse();
        assertThat(estado()).isEqualTo("CONSUMIDO");
        assertThat(jdbc.queryForObject("SELECT empresa_id FROM hot_click_qa_alta_pyme_test_tb", Long.class)).isEqualTo(42L);

        Empresa ligada = negocio(42L);
        Empresa otra = negocio(99L);
        assertThat(s.empresaConCobroPymeTest(ligada)).isTrue();
        assertThat(s.empresaConCobroPymeTest(otra)).isFalse();
        assertThat(s.revocar()).isFalse();
    }

    @Test
    @DisplayName("Flag off, prod y staging no aplican la excepción al id ligado ni al otro con el mismo correo")
    void puertaCerradaNoOculta() {
        QaAltaPymeTestService s = abierta(ANTES);
        assertThat(consumir(s).tomado()).isTrue();
        s.vincular(42L, FIJO);
        for (QaAltaPymeTestService cerrada : List.of(servicio(false, "dev"), servicio(true, "prod"), servicio(true, "staging"))) {
            assertThat(cerrada.empresaConCobroPymeTest(negocio(42L))).isFalse();
            assertThat(cerrada.empresaConCobroPymeTest(negocio(99L))).isFalse();
            assertThat(cerrada.consumirSiAplica(FIJO)).isFalse();
        }
        assertThat(filas()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT empresa_id FROM hot_click_qa_alta_pyme_test_tb", Long.class)).isEqualTo(42L);
    }

    @Test
    @DisplayName("Aprobar el otro id con el mismo correo resuelve el cupo; el id ligado no")
    void aprobacionSoloDelIdLigado() {
        QaAltaPymeTestService s = abierta(ANTES);
        assertThat(consumir(s).tomado()).isTrue();
        s.vincular(42L, FIJO);

        CupoEmprendedorAprobacionService cupo = mock(CupoEmprendedorAprobacionService.class);
        Empresa ligada = negocio(42L);
        ligada.setPlanSaas("PYME");
        ligada.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        ligada.setEstadoEmpresa("PENDIENTE_APROBACION");
        Empresa out = aprobar(s, ligada, cupo);
        assertThat(out.getVisibilidadPublica()).isFalse();
        assertThat(out.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        verify(cupo, never()).resolverAlAprobar(any());

        Empresa otra = negocio(99L);
        otra.setPlanSaas("EMPRENDEDOR");
        otra.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        otra.setEstadoEmpresa("PENDIENTE_APROBACION");
        when(cupo.resolverAlAprobar(otra)).thenAnswer(inv -> {
            otra.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
            return CupoEmprendedorAprobacionService.Resultado.TRIAL_ASIGNADO;
        });
        Empresa publicada = aprobar(s, otra, cupo);
        assertThat(publicada.getVisibilidadPublica()).isTrue();
        assertThat(publicada.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        verify(cupo).resolverAlAprobar(otra);
    }

    @Test
    @DisplayName("Con la puerta cerrada, aprobar el id ligado no usa la excepción")
    void aprobarConFlagOffNoUsaLaExcepcion() {
        assertThat(consumir(abierta(ANTES)).tomado()).isTrue();
        abierta(ANTES).vincular(42L, FIJO);
        QaAltaPymeTestService apagada = servicio(false, "test");
        CupoEmprendedorAprobacionService cupo = mock(CupoEmprendedorAprobacionService.class);
        Empresa ligada = negocio(42L);
        ligada.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        ligada.setEstadoEmpresa("PENDIENTE_APROBACION");
        when(cupo.resolverAlAprobar(ligada)).thenReturn(CupoEmprendedorAprobacionService.Resultado.TRIAL_ASIGNADO);
        Empresa out = aprobar(apagada, ligada, cupo);
        assertThat(out.getVisibilidadPublica()).isTrue();
        verify(cupo).resolverAlAprobar(ligada);
    }

    @Test
    @DisplayName("El segundo alta del mismo correo, ya consumido, no vuelve a PYME y no mueve el id")
    void replayNoReasigna() {
        QaAltaPymeTestService s = abierta(ANTES);
        assertThat(consumir(s).tomado()).isTrue();
        s.vincular(42L, FIJO);
        jdbc.execute("CREATE TABLE hot_click_cupo_emprendedor_tb (id SMALLINT PRIMARY KEY, limite INT, usados INT)");
        jdbc.update("INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados) VALUES (1, 70, 9)");
        PlanRepository planes = mock(PlanRepository.class);
        Plan emprendedor = new Plan();
        emprendedor.setNombre("EMPRENDEDOR");
        when(planes.findByNombre(eq("EMPRENDEDOR"))).thenReturn(Optional.of(emprendedor));
        CupoEmprendedorService cupo = new CupoEmprendedorService(jdbc, planes, new TrialEmprendedorConfig(70, 90),
            mock(com.hotclick.repository.SuscripcionRepository.class), env("test"), true, s);
        Empresa segunda = new Empresa();
        var alta = cupo.aplicarAlta(segunda, FIJO);
        assertThat(alta.qaPymeCobroTest()).isFalse();
        assertThat(alta.pendienteCupo()).isTrue();
        assertThat(segunda.getPlanSaas()).isEqualTo("EMPRENDEDOR");
        assertThat(segunda.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        assertThat(jdbc.queryForObject("SELECT empresa_id FROM hot_click_qa_alta_pyme_test_tb", Long.class)).isEqualTo(42L);
        assertThat(jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class)).isEqualTo(9);
    }

    @Test
    @DisplayName("Si la transacción se revierte, la tabla sigue vacía y el reintento puede consumir")
    void rollbackPermiteReintento() {
        QaAltaPymeTestService s = abierta(ANTES);
        tx.executeWithoutResult(st -> {
            assertThat(s.consumirSiAplica(FIJO)).isTrue();
            st.setRollbackOnly();
        });
        assertThat(filas()).isZero();
        assertThat(consumir(s).tomado()).isTrue();
        assertThat(estado()).isEqualTo("CONSUMIDO");
    }

    @Test
    @DisplayName("Vencida no inserta el fixture; si ya había fila disponible, la marca EXPIRADO")
    void vencida() {
        QaAltaPymeTestService tarde = abierta(DESPUES);
        assertThat(tarde.consumirSiAplica(FIJO)).isFalse();
        assertThat(filas()).isZero();
        sembrarDisponible();
        assertThat(tarde.consumirSiAplica(FIJO)).isFalse();
        assertThat(estado()).isEqualTo("EXPIRADO");
        assertThat(tarde.empresaConCobroPymeTest(negocio(42L))).isFalse();
    }

    @Test
    @DisplayName("Revocar con la puerta abierta cierra el uso; sin puerta y sin fila no escribe el correo")
    void revocada() {
        assertThat(servicio(false, "prod").revocar()).isFalse();
        assertThat(filas()).isZero();
        QaAltaPymeTestService s = abierta(ANTES);
        assertThat(s.revocar()).isTrue();
        assertThat(s.revocar()).isFalse();
        assertThat(consumir(s).tomado()).isFalse();
        assertThat(estado()).isEqualTo("REVOCADO");
        assertThat(s.empresaConCobroPymeTest(negocio(42L))).isFalse();
    }

    @Test
    @DisplayName("Ocho altas a la vez dejan una sola fila CONSUMIDO")
    void carreraUnSoloGanador() throws Exception {
        QaAltaPymeTestService s = abierta(ANTES);
        List<Callable<Intento>> tareas = new ArrayList<>();
        for (int i = 0; i < 8; i++) tareas.add(() -> consumir(s));
        List<Intento> res = simultaneas(tareas);
        assertThat(res.stream().filter(Intento::tomado).count()).isEqualTo(1L);
        assertThat(estado()).isEqualTo("CONSUMIDO");
        assertThat(filas()).isEqualTo(1);
        assertThat(consumir(s).tomado()).isFalse();
    }

    @Test
    @DisplayName("Error real de H2 al consumir no deja el negocio en el trial")
    void errorDeBdNoCaeAlTrial() {
        QaAltaPymeTestService s = abierta(ANTES);
        jdbc.execute("DROP TABLE hot_click_qa_alta_pyme_test_tb");
        CupoEmprendedorService cupo = new CupoEmprendedorService(jdbc, mock(PlanRepository.class),
            new TrialEmprendedorConfig(70, 90), mock(com.hotclick.repository.SuscripcionRepository.class),
            env("test"), true, s);
        Empresa empresa = new Empresa();
        assertThatThrownBy(() -> cupo.aplicarAlta(empresa, FIJO))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("No se pudo aplicar la excepción QA");
        assertThat(empresa.getPlanSaas()).isEqualTo("GRATUITO");
        assertThat(empresa.getEstadoPlan()).isEqualTo("ACTIVO");
    }

    @Test
    @DisplayName("H2 no aborta la transacción como PostgreSQL: ese caso corre en QaAltaPymeTestPostgresTest")
    void h2NoAbortaLaTransaccion() {
        QaAltaPymeTestService s = abierta(ANTES);
        jdbc.execute("DROP TABLE hot_click_qa_alta_pyme_test_tb");
        tx.executeWithoutResult(st -> assertThatThrownBy(() -> s.consumirSiAplica(FIJO))
            .isInstanceOf(IllegalStateException.class));
        Integer uno = tx.execute(st -> jdbc.queryForObject("SELECT 1", Integer.class));
        assertThat(uno).isEqualTo(1);
    }

    private Empresa aprobar(QaAltaPymeTestService s, Empresa e, CupoEmprendedorAprobacionService cupo) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findByIdForUpdate(e.getId())).thenReturn(Optional.of(e));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        EmpresaAprobacionService aprob = new EmpresaAprobacionService();
        ReflectionTestUtils.setField(aprob, "empresaRepository", repo);
        ReflectionTestUtils.setField(aprob, "productoRepository", mock(ProductoRepository.class));
        ReflectionTestUtils.setField(aprob, "solicitudAprobacionRepository", mock(SolicitudAprobacionRepository.class));
        ReflectionTestUtils.setField(aprob, "productoService", mock(ProductoService.class));
        ReflectionTestUtils.setField(aprob, "ubicacionDespachoService", mock(UbicacionDespachoService.class));
        ReflectionTestUtils.setField(aprob, "cupoEmprendedorAprobacionService", cupo);
        ReflectionTestUtils.setField(aprob, "qaAltaPymeTest", s);
        return aprob.aprobarYPublicar(e.getId());
    }

    private void sembrarDisponible() {
        jdbc.update("INSERT INTO hot_click_qa_alta_pyme_test_tb "
            + "(id, correo_normalizado, plan_destino, estado, vence_en) VALUES (1, ?, 'PYME', 'DISPONIBLE', ?)",
            FIJO, java.sql.Timestamp.valueOf(QaAltaPymeTestService.VENCE));
    }

    private Intento consumir(QaAltaPymeTestService s) {
        try {
            Boolean tomado = tx.execute(st -> s.consumirSiAplica(FIJO));
            return new Intento(Boolean.TRUE.equals(tomado), false);
        } catch (RuntimeException ex) {
            return new Intento(false, true);
        }
    }

    private QaAltaPymeTestService abierta(Clock reloj) {
        return new QaAltaPymeTestService(jdbc, env("test"), true, "onvo_test_ficticia", "pk_test_ficticia", reloj);
    }

    private QaAltaPymeTestService servicio(boolean flag, String perfil) {
        return new QaAltaPymeTestService(jdbc, env(perfil), flag, "onvo_test_ficticia", "pk_test_ficticia", ANTES);
    }

    private MockEnvironment env(String perfil) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfil);
        return env;
    }

    private int filas() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb", Integer.class);
    }

    private String estado() {
        return jdbc.queryForObject("SELECT estado FROM hot_click_qa_alta_pyme_test_tb", String.class);
    }

    private static Empresa negocio(long id) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setCorreoEmpresa(FIJO);
        return e;
    }

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

    private record Intento(boolean tomado, boolean fallo) {}
}
