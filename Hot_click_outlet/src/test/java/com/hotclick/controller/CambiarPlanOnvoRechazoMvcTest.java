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
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

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
 * (resilience4j real con la config de application.properties) y no toca el plan local.
 */
@SpringBootTest(classes = CambiarPlanOnvoRechazoMvcTest.Cfg.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestPropertySource(locations = "classpath:application.properties",
    properties = "onvo.secret-key=llave-ficticia-de-test")
@DisplayName("[Billing] ALTO-02 cambiar-plan con rechazo ONVO → 422, circuito CLOSED")
class CambiarPlanOnvoRechazoMvcTest {

    @Configuration
    @ImportAutoConfiguration({AopAutoConfiguration.class,
        io.github.resilience4j.springboot3.circuitbreaker.autoconfigure.CircuitBreakerAutoConfiguration.class,
        io.github.resilience4j.springboot3.retry.autoconfigure.RetryAutoConfiguration.class})
    static class Cfg {
        @Bean RestTemplate restTemplate() { return new RestTemplate(); }
        @Bean OnvoBillingClient onvoBillingClient(RestTemplate rt) { return new OnvoBillingClient(rt); }
    }

    @Autowired OnvoBillingClient onvo;
    @Autowired RestTemplate restTemplate;
    @Autowired CircuitBreakerRegistry registry;

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    @Test
    void rechazo4xx_422_circuitoCerrado_planIntacto() throws Exception {
        Object objetivo = AopTestUtils.getTargetObject(onvo);
        assertThat(org.springframework.aop.support.AopUtils.isAopProxy(onvo)).isTrue();
        ReflectionTestUtils.setField(objetivo, "secretKey", "llave-ficticia-de-test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(manyTimes(), requestTo("https://api.onvopay.com/v1/subscriptions/sub_1/items/si_1"))
            .andRespond(withStatus(HttpStatus.BAD_REQUEST));

        Plan emprendedor = new Plan();
        emprendedor.setNombre("EMPRENDEDOR");
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        Suscripcion sub = new Suscripcion();
        sub.setPlan(emprendedor);

        SuscripcionService suscripcionService = mock(SuscripcionService.class);
        // Igual que cambiarPlanExistente: primero ONVO; el plan local solo cambia si ONVO acepta.
        when(suscripcionService.cambiarPlanOnvo(anyLong(), anyLong())).thenAnswer(inv -> {
            onvo.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme");
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
            auth, mock(CobroSuscripcionService.class), mock(PreciosPlanesConfig.class), guard)).build();
        TenantContext.set(7L);

        CircuitBreaker cb = registry.circuitBreaker("onvo");
        cb.reset();
        for (int i = 0; i < 6; i++) { // más que sliding-window-size=5: si contara, abriría
            mvc.perform(post("/api/billing/cambiar-plan/2"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.codigo").value(OnvoSolicitudRechazadaException.CODIGO))
                .andExpect(jsonPath("$.error").value(OnvoSolicitudRechazadaException.MENSAJE));
        }
        assertThat(OnvoSolicitudRechazadaException.MENSAJE).contains("Probá").contains("escribinos");
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.CLOSED);
        assertThat(cb.getMetrics().getNumberOfFailedCalls()).isZero();
        assertThat(sub.getPlan().getNombre()).isEqualTo("EMPRENDEDOR");
    }
}
