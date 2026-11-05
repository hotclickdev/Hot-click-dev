package com.hotclick.controller;

import com.hotclick.repository.PlanRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.TenantContext;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.suscripcion.CobroSuscripcionService;
import com.hotclick.service.suscripcion.OnvoAltaReconciliacion;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** BAJO seguridad: POST /api/billing/reconciliar-pago con tope 6/min por empresa; al pasarse, 429 sin llamar a ONVO. */
@DisplayName("[Billing] rate limit de reconciliar-pago por empresa")
class ReconciliarPagoRateLimitTest {

    OnvoAltaReconciliacion reconciliacion;
    MockMvc mvc;
    final Map<String, Integer> usos = new HashMap<>();

    @BeforeEach
    void setUp() throws Exception {
        PropietarioGuard guard = mock(PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(anyLong())).thenReturn(true);
        reconciliacion = mock(OnvoAltaReconciliacion.class);
        when(reconciliacion.reconciliarEmpresa(anyLong())).thenReturn(OnvoAltaReconciliacion.Resultado.SIN_CONFIRMAR);
        // Ventana fija en memoria con la misma firma que el RateLimiter real.
        RateLimiter limiter = mock(RateLimiter.class);
        when(limiter.tryAcquire(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt())).thenAnswer(i -> {
            int n = usos.merge(i.getArgument(0), 1, Integer::sum);
            return n <= (int) i.getArgument(1);
        });
        SuscripcionController c = new SuscripcionController(mock(SuscripcionService.class), mock(PlanRepository.class),
            mock(AuthSupport.class), mock(CobroSuscripcionService.class), mock(PreciosPlanesConfig.class), guard);
        set(c, "reconciliacion", reconciliacion);
        set(c, "rateLimiter", limiter);
        mvc = MockMvcBuilders.standaloneSetup(c).build();
    }

    private static void set(Object o, String campo, Object v) throws Exception {
        var f = SuscripcionController.class.getDeclaredField(campo);
        f.setAccessible(true);
        f.set(o, v);
    }

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    @Test
    @DisplayName("6 llamadas pasan; la 7.ª da 429 en voseo y no consulta ONVO; otra empresa tiene su propio cupo")
    void septimaDa429() throws Exception {
        TenantContext.set(20L);
        for (int i = 0; i < 6; i++) {
            mvc.perform(post("/api/billing/reconciliar-pago")).andExpect(status().isOk());
        }
        mvc.perform(post("/api/billing/reconciliar-pago"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.status").value("pendiente"))
            .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Esperá")));
        verify(reconciliacion, times(6)).reconciliarEmpresa(20L);

        TenantContext.set(21L);
        mvc.perform(post("/api/billing/reconciliar-pago")).andExpect(status().isOk());
        verify(reconciliacion, times(1)).reconciliarEmpresa(21L);
    }
}
