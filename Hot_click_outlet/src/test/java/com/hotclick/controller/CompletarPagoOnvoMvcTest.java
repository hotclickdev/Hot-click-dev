package com.hotclick.controller;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.exception.PriceIdOnvoFaltanteException;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.suscripcion.CobroSuscripcionService;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** ALTO-02b: POST /api/billing/completar-pago y el 503 por falta de ONVO_PRICE_ID_{PLAN}. */
@DisplayName("[Billing] ALTO-02b completar-pago y price ONVO faltante")
class CompletarPagoOnvoMvcTest {

    SuscripcionService suscripcionService;
    PropietarioGuard guard;
    PlanRepository planRepo;
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        suscripcionService = mock(SuscripcionService.class);
        guard = mock(PropietarioGuard.class);
        planRepo = mock(PlanRepository.class);
        AuthSupport auth = mock(AuthSupport.class);
        com.hotclick.model.Usuario u = new com.hotclick.model.Usuario();
        u.setCorreoVerificado(true);
        when(auth.usuarioFromRequest(any())).thenReturn(u);
        mvc = MockMvcBuilders.standaloneSetup(new SuscripcionController(suscripcionService, planRepo,
                auth, mock(CobroSuscripcionService.class), mock(PreciosPlanesConfig.class), guard))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        TenantContext.set(20L);
    }

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    @Test
    void completarPago_requierePago() throws Exception {
        when(guard.puedeGestionarEmpresa(20L)).thenReturn(true);
        when(suscripcionService.completarPagoOnvo(20L)).thenReturn(Map.of(
            "status", "requiere_pago", "subscriptionId", "sub_1", "customerId", "cus_1", "planNombre", "PYME"));
        mvc.perform(post("/api/billing/completar-pago"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("requiere_pago"))
            .andExpect(jsonPath("$.subscriptionId").value("sub_1"))
            .andExpect(jsonPath("$.proveedor").value("ONVO"));
        verify(suscripcionService, never()).cambiarPlanOnvo(anyLong(), anyLong());
    }

    @Test
    void completarPago_noPropietario_403() throws Exception {
        when(guard.puedeGestionarEmpresa(20L)).thenReturn(false);
        mvc.perform(post("/api/billing/completar-pago")).andExpect(status().isForbidden());
        verify(suscripcionService, never()).completarPagoOnvo(anyLong());
    }

    @Test
    void completarPago_errorGenerico400() throws Exception {
        when(guard.puedeGestionarEmpresa(20L)).thenReturn(true);
        when(suscripcionService.completarPagoOnvo(20L)).thenThrow(new IllegalStateException("Price ONVO desconocido"));
        mvc.perform(post("/api/billing/completar-pago"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value(SuscripcionController.MSG_SOLICITUD));
    }

    @Test
    void cambiarPlan_faltaPriceId_503() throws Exception {
        when(guard.puedeGestionarEmpresa(20L)).thenReturn(true);
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        when(planRepo.findById(2L)).thenReturn(Optional.of(pyme));
        when(suscripcionService.cambiarPlanOnvo(20L, 2L)).thenThrow(new PriceIdOnvoFaltanteException("PYME"));
        mvc.perform(post("/api/billing/cambiar-plan/2"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.codigo").value(PriceIdOnvoFaltanteException.CODIGO))
            .andExpect(jsonPath("$.error").value(PriceIdOnvoFaltanteException.MENSAJE));
    }
}
