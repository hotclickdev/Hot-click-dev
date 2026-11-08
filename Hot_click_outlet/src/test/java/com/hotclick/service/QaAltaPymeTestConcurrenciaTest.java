package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Excepción QA PYME TEST: un uso, reintento, vencimiento, revocación y carrera")
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
        jdbc.update("INSERT INTO hot_click_qa_alta_pyme_test_tb "
            + "(id, correo_normalizado, plan_destino, estado, vence_en) VALUES (1, ?, 'PYME', 'DISPONIBLE', "
            + "TIMESTAMP '2026-11-30 23:59:59')", FIJO);
    }

    @AfterEach
    void tearDown() {
        jdbc.execute("DROP ALL OBJECTS");
    }

    @Test
    @DisplayName("Un uso, el reintento no vuelve a tomarla, y se liga una sola empresa")
    void unUsoYReintento() {
        QaAltaPymeTestService s = abierta(ANTES);
        assertThat(consumir(s)).isTrue();
        s.vincular(42L, "QA.SIM.ALTA20261108@hotclick.test");
        assertThat(consumir(s)).isFalse();
        assertThat(estado()).isEqualTo("CONSUMIDO");
        assertThat(jdbc.queryForObject("SELECT empresa_id FROM hot_click_qa_alta_pyme_test_tb", Long.class)).isEqualTo(42L);
        assertThat(s.revocar()).isFalse();
        Empresa empresa = new Empresa();
        empresa.setId(42L);
        empresa.setCorreoEmpresa(FIJO);
        assertThat(s.empresaConCobroPymeTest(empresa)).isTrue();
        Empresa otra = new Empresa();
        otra.setCorreoEmpresa("otra@tienda.test");
        assertThat(s.empresaConCobroPymeTest(otra)).isFalse();
    }

    @Test
    @DisplayName("Si la transacción del alta se revierte, el reintento puede consumir")
    void rollbackPermiteReintento() {
        QaAltaPymeTestService s = abierta(ANTES);
        tx.executeWithoutResult(st -> {
            assertThat(s.consumirSiAplica(FIJO)).isTrue();
            st.setRollbackOnly();
        });
        assertThat(estado()).isEqualTo("DISPONIBLE");
        assertThat(consumir(s)).isTrue();
        assertThat(estado()).isEqualTo("CONSUMIDO");
    }

    @Test
    @DisplayName("Vencida no se consume y queda EXPIRADO")
    void vencida() {
        QaAltaPymeTestService s = abierta(DESPUES);
        assertThat(consumir(s)).isFalse();
        assertThat(estado()).isEqualTo("EXPIRADO");
        assertThat(s.empresaConCobroPymeTest(empresaFixture())).isFalse();
    }

    @Test
    @DisplayName("Revocada no se consume y no asigna el cobro")
    void revocada() {
        QaAltaPymeTestService s = abierta(ANTES);
        assertThat(s.revocar()).isTrue();
        assertThat(s.revocar()).isFalse();
        assertThat(consumir(s)).isFalse();
        assertThat(estado()).isEqualTo("REVOCADO");
        assertThat(s.empresaConCobroPymeTest(empresaFixture())).isFalse();
    }

    @Test
    @DisplayName("Ocho altas a la vez consumen la fila una sola vez")
    void carreraUnSoloGanador() throws Exception {
        QaAltaPymeTestService s = abierta(ANTES);
        List<Callable<Boolean>> tareas = new ArrayList<>();
        for (int i = 0; i < 8; i++) tareas.add(() -> consumir(s));
        List<Boolean> res = simultaneas(tareas);
        assertThat(res.stream().filter(Boolean.TRUE::equals).count()).isEqualTo(1L);
        assertThat(estado()).isEqualTo("CONSUMIDO");
        assertThat(consumir(s)).isFalse();
    }

    private boolean consumir(QaAltaPymeTestService s) {
        Boolean tomado = tx.execute(st -> s.consumirSiAplica(FIJO));
        return Boolean.TRUE.equals(tomado);
    }

    private QaAltaPymeTestService abierta(Clock reloj) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");
        return new QaAltaPymeTestService(jdbc, env, true, "onvo_test_ficticia", "pk_test_ficticia", reloj);
    }

    private String estado() {
        return jdbc.queryForObject("SELECT estado FROM hot_click_qa_alta_pyme_test_tb", String.class);
    }

    private static Empresa empresaFixture() {
        Empresa e = new Empresa();
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
}
