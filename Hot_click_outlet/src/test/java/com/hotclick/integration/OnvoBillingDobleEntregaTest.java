package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler.Resultado;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

/** Seguridad ciclo 2 (MEDIO-ALTO): dos entregas simultáneas del mismo evento → un solo COBRO_OK. */
@DisplayName("[C2-2] Webhook billing ONVO: doble entrega concurrente aplica el efecto una sola vez")
class OnvoBillingDobleEntregaTest extends BaseIntegrationTest {

    private static final String EVENTO = "onvo_subscription.renewal.succeeded_clinv_c2";
    private static final String DOC = """
        {"id":"clinv_c2","mode":"live","status":"paid","currency":"CRC","total":1200000,
         "subscriptionId":"clsub_c2","periodEnd":"2026-12-01T06:00:00.000Z"}""";

    @MockitoBean private OnvoBillingClient onvo;
    @MockitoBean private SuscripcionService suscripcionService;
    @MockitoBean private PlanRepository planRepo;

    @Autowired private OnvoBillingWebhookHandler handler;
    @Autowired private StripeEventoRepository eventoRepo;

    private final AtomicInteger cobros = new AtomicInteger();

    @BeforeEach
    void armar() {
        eventoRepo.deleteById(EVENTO);
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        doReturn(Map.of("id", "clinv_c2", "subscriptionId", "clsub_c2", "status", "paid", "mode", "live",
            "currency", "CRC", "customerId", "cus_1", "total", 1_200_000, "periodEnd", "2026-12-01T06:00:00.000Z"))
            .when(onvo).obtenerRenovacion("clinv_c2");
        doReturn(Map.of("id", "clsub_c2", "status", "active", "mode", "live", "customerId", "cus_1",
            "currentPeriodEnd", "2026-12-01T06:00:00.000Z", "items", List.of(Map.of("id", "it", "priceId", "price_pyme"))))
            .when(onvo).obtenerSuscripcion("clsub_c2");
        Plan plan = new Plan();
        plan.setNombre("PYME");
        plan.setPrecioMensual(12000);
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(plan));
        doAnswer(i -> { cobros.incrementAndGet(); Thread.sleep(300); return null; })
            .when(suscripcionService).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @AfterEach
    void limpiar() {
        eventoRepo.deleteById(EVENTO);
    }

    @Test
    @DisplayName("Dos entregas a la vez: una PROCESADO, la otra DUPLICADO; COBRO_OK una sola vez")
    void dobleEntregaConcurrente() throws Exception {
        JsonNode data = new ObjectMapper().readTree(DOC);
        CyclicBarrier barrera = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Resultado>> fs = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                fs.add(pool.submit(() -> {
                    barrera.await(5, TimeUnit.SECONDS);
                    return handler.procesar("subscription.renewal.succeeded", data, null);
                }));
            }
            List<Resultado> rs = new ArrayList<>();
            for (Future<Resultado> f : fs) rs.add(f.get(20, TimeUnit.SECONDS));
            assertThat(rs).containsExactlyInAnyOrder(Resultado.PROCESADO, Resultado.DUPLICADO);
        } finally {
            pool.shutdownNow();
        }
        assertThat(cobros.get()).isEqualTo(1);
        assertThat(eventoRepo.findById(EVENTO)).get().extracting(e -> e.getProcesadoOk()).isEqualTo(true);
    }

    @Test
    @DisplayName("Reentrega secuencial tras éxito: DUPLICADO sin segundo efecto")
    void reentregaSecuencial() throws Exception {
        JsonNode data = new ObjectMapper().readTree(DOC);
        assertThat(handler.procesar("subscription.renewal.succeeded", data, null)).isEqualTo(Resultado.PROCESADO);
        assertThat(handler.procesar("subscription.renewal.succeeded", data, null)).isEqualTo(Resultado.DUPLICADO);
        assertThat(cobros.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("Fallo transitorio en el despacho revierte y deja el evento reprocesable")
    void falloTransitorioRevierte() throws Exception {
        JsonNode data = new ObjectMapper().readTree(DOC);
        doAnswer(i -> { throw new IllegalStateException("plan"); })
            .doAnswer(i -> { cobros.incrementAndGet(); return null; })
            .when(suscripcionService).procesarPagoOnvoVerificado(any(), any(), any());
        org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> handler.procesar("subscription.renewal.succeeded", data, null)).isInstanceOf(IllegalStateException.class);
        assertThat(eventoRepo.findById(EVENTO)).get().extracting(e -> e.getError()).isEqualTo("IllegalStateException");
        assertThat(handler.procesar("subscription.renewal.succeeded", data, null)).isEqualTo(Resultado.PROCESADO);
        assertThat(cobros.get()).isEqualTo(1);
    }
}
