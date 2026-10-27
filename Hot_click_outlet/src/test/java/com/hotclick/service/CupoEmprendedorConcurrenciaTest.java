package com.hotclick.service;

import com.hotclick.repository.PlanRepository;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.OptionalInt;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contador del trial Emprendedor contra una BD real (H2 en modo PostgreSQL), con altas simultáneas: nunca se
 * entregan más puestos que el cupo y cada puesto se entrega una sola vez.
 */
@DisplayName("Cupo trial Emprendedor: concurrencia")
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
    }

    @AfterEach
    void tearDown() {
        jdbc.execute("DROP ALL OBJECTS");
    }

    private CupoEmprendedorService servicio(int cupo) {
        return new CupoEmprendedorService(jdbc, Mockito.mock(PlanRepository.class),
            new TrialEmprendedorConfig(cupo, 90));
    }

    private OptionalInt reservar(CupoEmprendedorService service) {
        return tx.execute(st -> service.reservarCupoGratis());
    }

    /** Lanza {@code altas} altas a la vez (compuerta común) y devuelve el puesto de cada una (vacío = sin trial). */
    private List<OptionalInt> altasSimultaneas(CupoEmprendedorService service, int altas) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(altas);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<OptionalInt>> futuros = new ArrayList<>();
        for (int i = 0; i < altas; i++) {
            Callable<OptionalInt> alta = () -> {
                salida.await();
                return tx.execute(st -> service.reservarCupoGratis());
            };
            futuros.add(pool.submit(alta));
        }
        salida.countDown();
        List<OptionalInt> out = new ArrayList<>();
        for (Future<OptionalInt> f : futuros) out.add(f.get(60, TimeUnit.SECONDS));
        pool.shutdownNow();
        return out;
    }

    @Test
    @DisplayName("100 altas simultáneas con cupo 70: exactamente 70 reciben trial, puestos 1..70 sin repetir")
    void nuncaMasDeSetentaConAltasSimultaneas() throws Exception {
        List<OptionalInt> res = altasSimultaneas(servicio(70), 100);

        List<Integer> puestos = res.stream().filter(OptionalInt::isPresent)
            .map(OptionalInt::getAsInt).sorted().collect(Collectors.toList());
        assertThat(puestos).hasSize(70);
        assertThat(puestos).doesNotHaveDuplicates();
        assertThat(puestos.get(0)).isEqualTo(1);
        assertThat(puestos.get(69)).isEqualTo(70);
        assertThat(res.stream().filter(r -> !r.isPresent()).count()).isEqualTo(30);
        assertThat(jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class)).isEqualTo(70);
    }

    @Test
    @DisplayName("El negocio 71 no recibe trial (secuencial)")
    void elSetentaYunoNoRecibeTrial() {
        CupoEmprendedorService service = servicio(70);
        for (int i = 1; i <= 70; i++) {
            assertThat(reservar(service).isPresent()).isTrue();
        }
        assertThat(reservar(service).isPresent()).isFalse();
        assertThat(jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class)).isEqualTo(70);
    }

    @Test
    @DisplayName("El tope sale de la configuración: cupo 5 entrega solo 5 aunque la fila diga 70")
    void topeConfigurable() throws Exception {
        List<OptionalInt> res = altasSimultaneas(servicio(5), 20);

        assertThat(res.stream().filter(OptionalInt::isPresent).count()).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT limite FROM hot_click_cupo_emprendedor_tb", Integer.class)).isEqualTo(5);
    }

    @Test
    @DisplayName("Rollback del alta devuelve el puesto")
    void rollbackDevuelveElPuesto() {
        CupoEmprendedorService service = servicio(2);
        tx.execute(st -> {
            assertThat(service.reservarCupoGratis().isPresent()).isTrue();
            st.setRollbackOnly();
            return null;
        });
        assertThat(jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class)).isZero();
    }

    @Test
    @DisplayName("Fail-closed: sin tabla de cupo no hay trial")
    void sinTablaNoHayTrial() {
        jdbc.execute("DROP TABLE hot_click_cupo_emprendedor_tb");
        assertThat(servicio(70).reservarCupoGratis().isPresent()).isFalse();
    }
}
