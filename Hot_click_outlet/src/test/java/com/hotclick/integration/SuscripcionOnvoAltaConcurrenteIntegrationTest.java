package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.suscripcion.SuscripcionOnvoChangeService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * M1 (Seguridad #422) con BD real (H2) y el lock de fila real ({@code findByIdForUpdate}): dos (o más) POST a la vez
 * para el mismo negocio terminan con UNA sola suscripción ONVO creada y guardada; el resto reutiliza su id.
 * ONVO es un mock con latencia (para que las llamadas se solapen de verdad). Contra PostgreSQL el mismo lock
 * ({@code SELECT … FOR UPDATE}) da la misma garantía.
 */
@DisplayName("M1: dos altas ONVO simultáneas del mismo negocio crean una sola suscripción")
class SuscripcionOnvoAltaConcurrenteIntegrationTest extends BaseIntegrationTest {

    @MockitoBean OnvoBillingClient onvoBilling;

    @Autowired SuscripcionOnvoChangeService service;
    @Autowired EmpresaRepository empresaRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SuscripcionRepository suscripcionRepository;

    private final AtomicInteger creaciones = new AtomicInteger();
    private Long empresaId;

    @BeforeEach
    void setUpAlta() {
        Plan plan = planRepository.findByNombre("EMPRENDEDOR").orElseGet(() -> {
            Plan p = new Plan();
            p.setNombre("EMPRENDEDOR");
            return planRepository.saveAndFlush(p);
        });
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusDays(40);
        Empresa e = new Empresa();
        e.setNombreEmpresa("alta-it");
        e.setNombreComercial("alta-it");
        e.setSlug("alta-it-1");
        e.setCorreoEmpresa("alta-it@test.cr");
        e.setEstadoEmpresa("ACTIVA");
        e.setFechaRegistro(LocalDateTime.now());
        e.setPlanSaas("EMPRENDEDOR");
        e.setPlan(plan);
        e.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        e.setTrialEmprendedorPos(1);
        e.setTrialEmprendedorHasta(fin);
        e.setTrialHasta(fin);
        e.setVisibilidadPublica(true);
        empresaId = empresaRepository.saveAndFlush(e).getId();

        when(onvoBilling.isMockMode()).thenReturn(false);
        when(onvoBilling.sinLlave()).thenReturn(false);
        when(onvoBilling.isBillingDeshabilitado()).thenReturn(false);
        when(onvoBilling.getPriceIdForPlan("EMPRENDEDOR")).thenReturn("price_emprendedor");
        when(onvoBilling.crearCustomer(any(), any(), anyMap())).thenReturn(new OnvoBillingClient.OnvoCustomer("cus_it"));
        when(onvoBilling.crearSuscripcionIncompleta(anyString(), anyString(), anyMap(), anyInt())).thenAnswer(inv -> {
            int n = creaciones.incrementAndGet();
            Thread.sleep(300); // latencia de ONVO: fuerza el solape de las llamadas
            return new OnvoBillingClient.OnvoSubscription("sub_it_" + n, "item_" + n);
        });
    }

    @AfterEach
    void limpiarAlta() {
        jdbcTemplate.update("DELETE FROM hot_click_suscripcion_tb");
        miembroEmpresaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Tres POST simultáneos: ONVO recibe una creación, todos devuelven el mismo id y queda una fila")
    void postsSimultaneosCreanUnaSolaSuscripcion() throws Exception {
        int hilos = 3;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<SuscripcionOnvoChangeService.SuscripcionTrial>> futuros = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            Callable<SuscripcionOnvoChangeService.SuscripcionTrial> tarea = () -> {
                salida.await();
                return service.asegurarSuscripcionTrial(empresaId);
            };
            futuros.add(pool.submit(tarea));
        }
        salida.countDown();
        List<String> ids = new ArrayList<>();
        for (Future<SuscripcionOnvoChangeService.SuscripcionTrial> f : futuros) {
            ids.add(f.get(60, TimeUnit.SECONDS).subscriptionId());
        }
        pool.shutdownNow();

        assertThat(creaciones.get()).as("creaciones en ONVO").isEqualTo(1);
        assertThat(ids).containsOnly("sub_it_1");
        List<Suscripcion> filas = suscripcionRepository.findActivasByEmpresaId(empresaId);
        assertThat(filas).hasSize(1);
        assertThat(filas.get(0).getOnvoSubscriptionId()).isEqualTo("sub_it_1");
        verify(onvoBilling, org.mockito.Mockito.never()).cancelarInmediato(anyString());
    }

    @Test
    @DisplayName("Reintento secuencial tras un alta guardada: reutiliza, no crea otra en ONVO")
    void reintentoSecuencialNoDuplica() {
        String a = service.asegurarSuscripcionTrial(empresaId).subscriptionId();
        String b = service.asegurarSuscripcionTrial(empresaId).subscriptionId();

        assertThat(a).isEqualTo(b);
        assertThat(creaciones.get()).isEqualTo(1);
        assertThat(suscripcionRepository.findActivasByEmpresaId(empresaId)).hasSize(1);
    }
}
