package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.suscripcion.LockTimeoutPorFila;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Humo de #426 sobre PostgreSQL REAL: LockTimeoutPorFila ({@code SET LOCAL lock_timeout}) + findByIdForUpdate.
 * Una transacción retiene el lock de la fila del negocio; la segunda (REQUIRES_NEW, como el alta ONVO) debe fallar
 * a los ~lock-timeout-ms con una de las excepciones que {@code SuscripcionOnvoChangeService.bloquearEmpresa}
 * traduce a 409 ALTA_ONVO_EN_CURSO, en vez de colgarse. En H2 se omite (el SET LOCAL solo aplica a Postgres).
 */
@DisplayName("#426 | lock_timeout por fila en PostgreSQL real (humo)")
class LockTimeoutPostgresSmokeTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private LockTimeoutPorFila lockTimeout;
    @Autowired private PlatformTransactionManager txManager;
    @Value("${hotclick.billing.lock-timeout-ms}") private int lockTimeoutMs;

    @AfterEach
    void limpiar() {
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("fila bloqueada por otra transacción → falla en ~lock-timeout-ms con la excepción que se mapea a 409")
    void segundoBloqueoFallaALosCincoSegundos() throws Exception {
        String motor = jdbcTemplate.execute((java.sql.Connection c) -> c.getMetaData().getDatabaseProductName());
        Assumptions.assumeTrue("PostgreSQL".equals(motor), "requiere PostgreSQL real");

        Empresa e = new Empresa();
        e.setNombreEmpresa("Lock Timeout Smoke");
        e.setSlug("lock-timeout-smoke");
        e.setCorreoEmpresa("lock-timeout-smoke@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        Long id = empresaRepository.saveAndFlush(e).getId();

        CountDownLatch bloqueado = new CountDownLatch(1);
        CountDownLatch soltar = new CountDownLatch(1);
        ExecutorService ex = Executors.newSingleThreadExecutor();
        Future<?> retenedor = ex.submit(() -> new TransactionTemplate(txManager).executeWithoutResult(s -> {
            empresaRepository.findByIdForUpdate(id).orElseThrow();
            bloqueado.countDown();
            try { soltar.await(30, TimeUnit.SECONDS); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
        }));
        try {
            assertThat(bloqueado.await(10, TimeUnit.SECONDS)).isTrue();

            TransactionTemplate nueva = new TransactionTemplate(txManager);
            nueva.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            long t0 = System.nanoTime();
            Throwable error = org.assertj.core.api.Assertions.catchThrowable(() -> nueva.executeWithoutResult(s -> {
                lockTimeout.aplicar();
                empresaRepository.findByIdForUpdate(id);
            }));
            long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0);

            assertThat(error).as("debe fallar, no colgarse").isNotNull();
            assertThat(error).isInstanceOfAny(
                org.springframework.dao.PessimisticLockingFailureException.class,
                jakarta.persistence.PessimisticLockException.class,
                jakarta.persistence.LockTimeoutException.class);
            assertThat(ms).isBetween(lockTimeoutMs - 500L, lockTimeoutMs + 4000L);
            System.out.println("[smoke-lock-timeout] excepcion=" + error.getClass().getName() + " espera_ms=" + ms
                + " lock_timeout_ms=" + lockTimeoutMs);
        } finally {
            soltar.countDown();
            retenedor.get(30, TimeUnit.SECONDS);
            ex.shutdownNow();
        }

        // Control: soltado el lock, el mismo camino funciona.
        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            lockTimeout.aplicar();
            assertThat(empresaRepository.findByIdForUpdate(id)).isPresent();
        });
    }
}
