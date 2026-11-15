package com.hotclick.service.payment;

import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.core.LockProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * fix2: limitador OPERATIVO de la alerta de backlog con el LockProvider REAL de ShedLockConfig (tabla shedlock, reloj
 * de la base). Corre sobre H2 (contexto compartido de los integration tests): prueba la semántica entre instancias,
 * reinicio y ventana vencida; la equivalencia con PostgreSQL queda pendiente del job PG. No es entrega durable ni
 * exactly-once: solo limita avisos. El repositorio de pagos es un doble (solo da el tamaño del backlog).
 */
@DisplayName("fix2 | alerta de backlog: una por ventana entre instancias y reinicios (ShedLock real), sin memoria")
class AlertaBacklogLimitadorShedLockTest extends BaseIntegrationTest {

    @Autowired private LockProvider lockProvider;
    @Autowired private OnvoRechazoService onvoRechazoService;
    @Autowired private PlatformTransactionManager txManager;

    private final PagoRepository pagos = mock(PagoRepository.class);

    @BeforeEach
    void armar() {
        jdbcTemplate.update("DELETE FROM shedlock WHERE name = ?", OnvoPendientesReconsultaService.LOCK_ALERTA_BACKLOG);
        when(pagos.contarBacklogConciliacion(any(), any())).thenReturn(5000L);
    }

    @AfterEach
    void limpiar() {
        jdbcTemplate.update("DELETE FROM shedlock WHERE name = ?", OnvoPendientesReconsultaService.LOCK_ALERTA_BACKLOG);
    }

    private OnvoPendientesReconsultaService instancia() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        var srv = new OnvoPendientesReconsultaService(pagos, onvo, mock(OnvoPaymentProvider.class), onvoRechazoService,
            txManager, 20, 5, 200, true);
        srv.setFairness(72, 1000, 60);
        srv.setLockProvider(lockProvider);
        srv.setJdbcTemplate(jdbcTemplate);
        return srv;
    }

    private static LocalDateTime ahora() { return LocalDateTime.now(Constants.ZONA_CR); }

    @Test
    @DisplayName("una alerta por ventana entre instancias y tras un reinicio; la fila vive en shedlock con nombre exclusivo")
    void unaPorVentanaEntreInstanciasYReinicio() {
        assertThat(instancia().alertarBacklog(ahora())).isTrue();
        assertThat(instancia().alertarBacklog(ahora())).as("otra instancia, misma ventana").isFalse();
        assertThat(instancia().alertarBacklog(ahora())).as("instancia nueva (reinicio), misma ventana").isFalse();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM shedlock WHERE name = ? AND lock_until > locked_at",
            Integer.class, OnvoPendientesReconsultaService.LOCK_ALERTA_BACKLOG)).isEqualTo(1);
    }

    @Test
    @DisplayName("ventana vencida (o caída sin liberar que ya expiró): el aviso siguiente sale")
    void ventanaVencidaPermiteAvisoSiguiente() {
        assertThat(instancia().alertarBacklog(ahora())).isTrue();
        jdbcTemplate.update("UPDATE shedlock SET lock_until = locked_at WHERE name = ?",
            OnvoPendientesReconsultaService.LOCK_ALERTA_BACKLOG);
        assertThat(instancia().alertarBacklog(ahora())).isTrue();
    }

    @Test
    @DisplayName("concurrencia: dos instancias a la vez → exactamente una alerta y ninguna espera")
    void concurrenteExactamenteUnaSinEspera() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CyclicBarrier largada = new CyclicBarrier(2);
            List<Future<Boolean>> r = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                var srv = instancia();
                r.add(pool.submit(() -> { largada.await(10, TimeUnit.SECONDS); return srv.alertarBacklog(ahora()); }));
            }
            long t0 = System.nanoTime();
            int emitidas = 0;
            for (Future<Boolean> f : r) if (f.get(10, TimeUnit.SECONDS)) emitidas++;
            assertThat(emitidas).isEqualTo(1);
            assertThat(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0)).isLessThan(5000);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("bajo el umbral no se toma la ventana (un aviso real posterior no queda tapado)")
    void bajoUmbralNoTomaVentana() {
        when(pagos.contarBacklogConciliacion(any(), any())).thenReturn(10L);
        assertThat(instancia().alertarBacklog(ahora())).isFalse();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM shedlock WHERE name = ?", Integer.class,
            OnvoPendientesReconsultaService.LOCK_ALERTA_BACKLOG)).isZero();
        when(pagos.contarBacklogConciliacion(any(), any())).thenReturn(5000L);
        assertThat(instancia().alertarBacklog(ahora())).isTrue();
    }

    @Test
    @DisplayName("la retención borra la fila del limitador (lock_until viejo): el aviso siguiente igual sale, sin reinicio")
    void filaBorradaPorRetencionNoSilenciaAvisos() {
        var srv = instancia();
        assertThat(srv.alertarBacklog(ahora())).isTrue();
        // Lo que hace DataRetentionScheduler#limpiarShedlockViejos con una fila vieja.
        jdbcTemplate.update("DELETE FROM shedlock WHERE name = ?", OnvoPendientesReconsultaService.LOCK_ALERTA_BACKLOG);
        assertThat(srv.alertarBacklog(ahora())).isTrue();
        assertThat(instancia().alertarBacklog(ahora())).as("y la ventana nueva vuelve a limitar").isFalse();
    }
}
