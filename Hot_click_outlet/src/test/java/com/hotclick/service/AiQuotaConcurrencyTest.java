package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.AiUsoRepository;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * [CONCURRENCIA] AiQuotaService — Prevención de Sobrecuota Bajo Carga Concurrente.
 *
 * La cuota de IA usa un UPSERT PostgreSQL con cláusula condicional
 * (INSERT...ON CONFLICT DO UPDATE WHERE llamadas < limite RETURNING llamadas).
 * Esa query nativa NO es compatible con H2, por lo que el test es unitario:
 * el mock de reservarSlot() simula la atomicidad de la SQL con AtomicInteger,
 * que es el proxy más fiel posible sin un PG real.
 *
 * Escenarios cubiertos:
 *   AIQUOTA-01  50 hilos vs cuota=10  → exactamente 10 obtienen slot
 *   AIQUOTA-02  ADMIN_IT (cuota=-1)   → todos los hilos obtienen slot (bypass)
 *   AIQUOTA-03  Plan sin créditos     → ningún hilo obtiene slot
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[CONCURRENCIA] AiQuotaService — Prevención de sobrecuota bajo carga concurrente")
class AiQuotaConcurrencyTest {

    @InjectMocks private AiQuotaService service;
    @Mock        private AiUsoRepository   aiUsoRepository;
    @Mock        private EmpresaRepository empresaRepository;

    private static final Long EMPRESA_ID = 77L;

    // ── AIQUOTA-01: 50 hilos, cuota = 10 → exactamente 10 obtienen slot ──────

    @Test
    @DisplayName("AIQUOTA-01 | CRÍTICO — 50 hilos vs cuota=10 → exactamente 10 obtienen slot atómicamente")
    void cincuentaHilos_cuotaDiez_exactamenteDiezGanan() throws InterruptedException {
        final int CUOTA = 10;
        final int HILOS = 50;

        Empresa empresa = mock(Empresa.class);
        when(empresa.getPlanSaas()).thenReturn("PRO");
        when(empresa.getPlan()).thenReturn(null); // fallback switch → PRO = 50... override vía mock
        // Para controlar el límite exacto, devolvemos un Plan con maxCreditosAi = CUOTA
        com.hotclick.model.Plan plan = mock(com.hotclick.model.Plan.class);
        when(plan.getMaxCreditosAi()).thenReturn(CUOTA);
        when(empresa.getPlan()).thenReturn(plan);
        when(empresaRepository.findById(EMPRESA_ID)).thenReturn(Optional.of(empresa));

        AtomicInteger slotsReservados = new AtomicInteger(0);
        when(aiUsoRepository.reservarSlot(eq(EMPRESA_ID), anyInt(), anyInt(), eq(CUOTA)))
            .thenAnswer(inv -> {
                // Simula: INSERT...ON CONFLICT DO UPDATE WHERE llamadas < limite RETURNING llamadas
                // AtomicInteger.getAndUpdate es atómico — mismo contrato que la SQL
                int prev = slotsReservados.getAndUpdate(n -> n < CUOTA ? n + 1 : n);
                return prev < CUOTA
                    ? List.of(new Object[]{(long) (prev + 1)}) // slot reservado
                    : List.of();                               // cuota llena
            });

        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch done     = new CountDownLatch(HILOS);
        AtomicInteger exitos    = new AtomicInteger(0);
        AtomicInteger rechazos  = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(HILOS);
        for (int i = 0; i < HILOS; i++) {
            pool.submit(() -> {
                try {
                    startGun.await();
                    boolean reservado = service.verificarYReservar(EMPRESA_ID);
                    if (reservado) exitos.incrementAndGet();
                    else           rechazos.incrementAndGet();
                } catch (InterruptedException ignored) {
                } finally {
                    done.countDown();
                }
            });
        }

        startGun.countDown();
        boolean completado = done.await(15, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(completado).as("Todos los hilos deben completar en 15 s").isTrue();
        assertThat(exitos.get())
            .as("Exactamente %d hilos deben obtener slot — AtomicInteger simula el WHERE de la SQL", CUOTA)
            .isEqualTo(CUOTA);
        assertThat(rechazos.get())
            .as("Los %d hilos restantes deben recibir false (cuota llena)", HILOS - CUOTA)
            .isEqualTo(HILOS - CUOTA);
        assertThat(slotsReservados.get())
            .as("El contador final no debe exceder la cuota — no hubo sobrecuota")
            .isEqualTo(CUOTA);
    }

    // ── AIQUOTA-02: ADMIN_IT (cuota=-1) → todos pasan sin llamar reservarSlot ─

    @Test
    @DisplayName("AIQUOTA-02 | HIGH — ADMIN_IT (cuota ilimitada) → todos los hilos obtienen slot, no se llama reservarSlot")
    void adminIt_cuotaIlimitada_todosGanan_sinLlamarReservarSlot() throws InterruptedException {
        final int HILOS = 20;

        Empresa empresa = mock(Empresa.class);
        when(empresa.getPlanSaas()).thenReturn("ADMIN_IT"); // resolverLimite → -1 (ilimitado)
        when(empresaRepository.findById(EMPRESA_ID)).thenReturn(Optional.of(empresa));

        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch done     = new CountDownLatch(HILOS);
        AtomicInteger exitos    = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(HILOS);
        for (int i = 0; i < HILOS; i++) {
            pool.submit(() -> {
                try {
                    startGun.await();
                    if (service.verificarYReservar(EMPRESA_ID)) exitos.incrementAndGet();
                } catch (InterruptedException ignored) {
                } finally {
                    done.countDown();
                }
            });
        }

        startGun.countDown();
        done.await(10, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(exitos.get())
            .as("ADMIN_IT bypass: todos los %d hilos deben obtener true sin límite", HILOS)
            .isEqualTo(HILOS);
        // La SQL de reserva nunca debe ser llamada para plan ilimitado
        verify(aiUsoRepository, never())
            .reservarSlot(anyLong(), anyInt(), anyInt(), anyInt());
    }

    // ── AIQUOTA-03: plan sin créditos → ningún hilo pasa ─────────────────────

    @Test
    @DisplayName("AIQUOTA-03 | HIGH — Plan sin créditos (maxCreditosAi=0) → ningún hilo obtiene slot")
    void planSinCreditos_ningunHiloPasa_sinLlamarReservarSlot() throws InterruptedException {
        final int HILOS = 20;

        Empresa empresa = mock(Empresa.class);
        when(empresa.getPlanSaas()).thenReturn("INICIO"); // no es ADMIN_IT
        com.hotclick.model.Plan plan = mock(com.hotclick.model.Plan.class);
        when(plan.getMaxCreditosAi()).thenReturn(0);
        when(empresa.getPlan()).thenReturn(plan);
        when(empresaRepository.findById(EMPRESA_ID)).thenReturn(Optional.of(empresa));

        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch done     = new CountDownLatch(HILOS);
        AtomicInteger exitos    = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(HILOS);
        for (int i = 0; i < HILOS; i++) {
            pool.submit(() -> {
                try {
                    startGun.await();
                    if (service.verificarYReservar(EMPRESA_ID)) exitos.incrementAndGet();
                } catch (InterruptedException ignored) {
                } finally {
                    done.countDown();
                }
            });
        }

        startGun.countDown();
        done.await(10, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(exitos.get())
            .as("Plan sin créditos: ningún hilo debe obtener slot")
            .isEqualTo(0);
        // Igual que ADMIN_IT, el early return impide llamar a la BD
        verify(aiUsoRepository, never())
            .reservarSlot(anyLong(), anyInt(), anyInt(), anyInt());
    }
}
