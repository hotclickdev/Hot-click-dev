package com.hotclick.controller;

import com.hotclick.exception.OnvoSolicitudRechazadaException;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.suscripcion.CobroSuscripcionService;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import com.hotclick.config.GlobalExceptionHandler;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.core.IntervalFunction;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.ExpectedCount.manyTimes;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ALTO-02: un 4xx de ONVO al cambiar el plan responde 422 en voseo, no abre el circuito {@code onvo}
 * y no toca el plan local. Sin contexto de Spring (evita sumar un contexto al caché y la caída de la
 * H2 compartida): CircuitBreaker y Retry de resilience4j armados a mano con los mismos valores de
 * application.properties; como las anotaciones no aplican fuera de Spring, la llamada a ONVO se
 * decora con el Retry y el CircuitBreaker reales.
 */
@DisplayName("[Billing] ALTO-02 cambiar-plan con rechazo ONVO → 422, circuito CLOSED")
class CambiarPlanOnvoRechazoMvcTest {

    /** Espejo de resilience4j.circuitbreaker.instances.onvo.* */
    @SuppressWarnings("unchecked")
    static CircuitBreakerRegistry registroCircuito() {
        return CircuitBreakerRegistry.of(CircuitBreakerConfig.custom()
            .slidingWindowSize(5)
            .failureRateThreshold(60)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .permittedNumberOfCallsInHalfOpenState(2)
            .ignoreExceptions(IllegalStateException.class, OnvoSolicitudRechazadaException.class)
            .build());
    }

    /** Espejo de resilience4j.retry.instances.onvo.* */
    @SuppressWarnings("unchecked")
    static RetryRegistry registroRetry() {
        return RetryRegistry.of(RetryConfig.custom()
            .maxAttempts(3)
            .intervalFunction(IntervalFunction.ofExponentialBackoff(Duration.ofSeconds(1), 2))
            .retryExceptions(ResourceAccessException.class, HttpServerErrorException.class)
            .build());
    }

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    @Test
    void rechazo4xx_422_circuitoCerrado_planIntacto() throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        OnvoBillingClient onvo = new OnvoBillingClient(restTemplate);
        ReflectionTestUtils.setField(onvo, "secretKey", "llave-ficticia-de-test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(manyTimes(), requestTo("https://api.onvopay.com/v1/subscriptions/sub_1/items/si_1"))
            .andRespond(withStatus(HttpStatus.BAD_REQUEST));

        CircuitBreaker cb = registroCircuito().circuitBreaker("onvo");
        Retry retry = registroRetry().retry("onvo");
        Runnable llamadaOnvo = Retry.decorateRunnable(retry,
            CircuitBreaker.decorateRunnable(cb, () -> onvo.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme")));
        Plan emprendedor = new Plan();
        emprendedor.setNombre("EMPRENDEDOR");
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        Suscripcion sub = new Suscripcion();
        sub.setPlan(emprendedor);

        SuscripcionService suscripcionService = mock(SuscripcionService.class);
        // Igual que cambiarPlanExistente: primero ONVO; el plan local solo cambia si ONVO acepta.
        when(suscripcionService.cambiarPlanOnvo(anyLong(), anyLong())).thenAnswer(inv -> {
            llamadaOnvo.run();
            sub.setPlan(pyme);
            return Map.of("status", "actualizando");
        });
        PlanRepository planRepo = mock(PlanRepository.class);
        when(planRepo.findById(2L)).thenReturn(Optional.of(pyme));
        PropietarioGuard guard = mock(PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
        AuthSupport auth = mock(AuthSupport.class);
        com.hotclick.model.Usuario u = new com.hotclick.model.Usuario();
        u.setCorreoVerificado(true);
        when(auth.usuarioFromRequest(any())).thenReturn(u);

        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SuscripcionController(suscripcionService, planRepo,
            auth, mock(CobroSuscripcionService.class), mock(PreciosPlanesConfig.class), guard))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        TenantContext.set(7L);

        for (int i = 0; i < 6; i++) { // más que sliding-window-size=5: si contara, abriría
            mvc.perform(post("/api/billing/cambiar-plan/2"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.codigo").value(OnvoSolicitudRechazadaException.CODIGO))
                .andExpect(jsonPath("$.error").value(OnvoSolicitudRechazadaException.MENSAJE));
        }
        assertThat(OnvoSolicitudRechazadaException.MENSAJE).contains("Probá").contains("escribinos");
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.CLOSED);
        assertThat(cb.getMetrics().getNumberOfFailedCalls()).isZero();
        assertThat(cb.getMetrics().getNumberOfNotPermittedCalls()).isZero();
        assertThat(retry.getMetrics().getNumberOfFailedCallsWithRetryAttempt()).isZero();
        assertThat(sub.getPlan().getNombre()).isEqualTo("EMPRENDEDOR");
    }
}
