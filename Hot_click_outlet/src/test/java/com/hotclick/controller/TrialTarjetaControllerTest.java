package com.hotclick.controller;

import com.hotclick.exception.CobroPlanNoDisponibleException;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.suscripcion.TrialTarjetaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("/api/billing/trial/tarjeta: solo propietario, negocio del JWT, fail-closed y respuesta uniforme")
class TrialTarjetaControllerTest {

    private final TrialTarjetaService service = mock(TrialTarjetaService.class);
    private final PropietarioGuard guard = mock(PropietarioGuard.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new TrialTarjetaController(service, guard)).build();

    @AfterEach void limpiar() { TenantContext.clear(); }

    @ParameterizedTest(name = "EDITOR/LECTOR recibe 403 en {0} y el servicio no se toca")
    @ValueSource(strings = {"GET", "POST"})
    void noPropietario403(String metodo) throws Exception {
        TenantContext.set(7L);
        when(guard.puedeGestionarEmpresa(any())).thenReturn(false);
        var req = metodo.equals("GET") ? get("/api/billing/trial/tarjeta") : post("/api/billing/trial/tarjeta");
        mvc.perform(req).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value(PropietarioGuard.MSG));
        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "sin negocio en el contexto → 401 en {0}")
    @ValueSource(strings = {"GET", "POST"})
    void sinTenant401(String metodo) throws Exception {
        var req = metodo.equals("GET") ? get("/api/billing/trial/tarjeta") : post("/api/billing/trial/tarjeta");
        mvc.perform(req).andExpect(status().isUnauthorized());
        verifyNoInteractions(service, guard);
    }

    @Test
    @DisplayName("El negocio sale siempre del JWT: un empresaId en query o cuerpo no cambia a quién se le atiende")
    void tenantSoloDelJwt() throws Exception {
        TenantContext.set(7L);
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(true);
        when(service.iniciar(7L)).thenReturn(Map.of("status", "tarjeta_guardada"));
        mvc.perform(post("/api/billing/trial/tarjeta?empresaId=99").contentType("application/json").content("{\"empresaId\":99}"))
            .andExpect(status().isOk());
        verify(service).iniciar(7L);
        verify(service, never()).iniciar(99L);
        verify(guard, never()).puedeGestionarEmpresa(99L);
    }

    @Test
    @DisplayName("Otro negocio (sin trial, pendiente, otro plan): mismo 409 y mismo cuerpo, sin pistas del motivo")
    void noDisponibleEsUniforme() throws Exception {
        when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
        when(service.iniciar(any())).thenThrow(new TrialTarjetaService.NoDisponibleException());
        String cuerpoA = mvcPost(7L);
        String cuerpoB = mvcPost(8L);
        org.assertj.core.api.Assertions.assertThat(cuerpoA).isEqualTo(cuerpoB)
            .contains(TrialTarjetaService.NoDisponibleException.CODIGO);
    }

    private String mvcPost(long empresaId) throws Exception {
        TenantContext.set(empresaId);
        return mvc.perform(post("/api/billing/trial/tarjeta")).andExpect(status().isConflict())
            .andReturn().getResponse().getContentAsString();
    }

    @Test
    @DisplayName("Fail-closed: cobro no configurado → 409 COBRO_PLAN_NO_DISPONIBLE; ONVO caído → 503 sin detalle interno")
    void failClosed() throws Exception {
        TenantContext.set(7L);
        when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
        when(service.iniciar(7L)).thenThrow(new CobroPlanNoDisponibleException("EMPRENDEDOR"));
        mvc.perform(post("/api/billing/trial/tarjeta")).andExpect(status().isConflict())
            .andExpect(jsonPath("$.codigo").value(CobroPlanNoDisponibleException.CODIGO));

        when(service.estado(7L)).thenThrow(new TrialTarjetaService.VerificacionNoDisponibleException(new RuntimeException("sk_secreto timeout")));
        mvc.perform(get("/api/billing/trial/tarjeta")).andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.codigo").value(TrialTarjetaService.VerificacionNoDisponibleException.CODIGO))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("sk_secreto"))));

        org.mockito.Mockito.doThrow(new RuntimeException("sk_secreto 500 interno")).when(service).iniciar(7L);
        mvc.perform(post("/api/billing/trial/tarjeta")).andExpect(status().isBadGateway())
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("sk_secreto"))));
    }

    @Test
    @DisplayName("GET devuelve solo elegible, tarjetaGuardada y trialDias")
    void estadoMinimo() throws Exception {
        TenantContext.set(7L);
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(true);
        when(service.estado(7L)).thenReturn(new TrialTarjetaService.Estado(true, true, 12));
        mvc.perform(get("/api/billing/trial/tarjeta")).andExpect(status().isOk())
            .andExpect(jsonPath("$.elegible").value(true))
            .andExpect(jsonPath("$.tarjetaGuardada").value(true))
            .andExpect(jsonPath("$.trialDias").value(12))
            .andExpect(jsonPath("$.length()").value(3));
    }
}
