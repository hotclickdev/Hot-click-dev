package com.hotclick.agente.metricas;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** AG-32: el alcance sale del usuario autenticado, nunca de un parámetro. */
class MetricasControllerTest {

    private MetricasService service;
    private CompanyScope scope;
    private TenantService tenant;
    private MockMvc mvc;

    @BeforeEach
    void init() {
        service = mock(MetricasService.class);
        scope = mock(CompanyScope.class);
        tenant = mock(TenantService.class);
        when(tenant.tieneFeature("ai")).thenReturn(true);
        mvc = MockMvcBuilders.standaloneSetup(new MetricasController(service, scope, tenant))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    private static MetricasDtos.Respuesta respuesta(String alcance) {
        MetricasDtos.Metricas m = new MetricasDtos.Metricas(new MetricasDtos.Embudo(1, 2, 3, 4), List.of(), List.of(),
            new MetricasDtos.Ventas(0, 0, List.of()), 0, new MetricasDtos.Perdidas(0, 0),
            new MetricasDtos.Costos(java.math.BigDecimal.ZERO, null, 0));
        return new MetricasDtos.Respuesta(LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 10), alcance, m, null, null);
    }

    @Test
    void negocioConsultaConSuPropiaEmpresaIgnorandoCualquierEmpresaDelRequest() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(service.consultar(eq(7L), any(), any())).thenReturn(respuesta("NEGOCIO"));

        mvc.perform(get("/api/agente/metricas").param("desde", "2026-12-01").param("hasta", "2026-12-10")
                .param("empresaId", "8"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.alcance").value("NEGOCIO"))
            .andExpect(jsonPath("$.propias.embudo.enlacesPagados").value(4));

        verify(service).consultar(7L, LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 10));
        verify(service, never()).consultar(eq(8L), any(), any());
    }

    @Test
    void adminUsaAlcanceNuloYNoExigeFeature() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null);
        when(tenant.tieneFeature("ai")).thenReturn(false);
        when(service.consultar(eq(null), any(), any())).thenReturn(respuesta("HOTCLICK"));

        mvc.perform(get("/api/agente/metricas")).andExpect(status().isOk())
            .andExpect(jsonPath("$.alcance").value("HOTCLICK"));
    }

    @Test
    void negocioSinPlanConIaRecibe403SinTocarElServicio() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(tenant.tieneFeature("ai")).thenReturn(false);

        mvc.perform(get("/api/agente/metricas")).andExpect(status().isForbidden());
        verify(service, never()).consultar(any(), any(), any());
    }

    @Test
    void rangoInvalidoEs400() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(service.consultar(eq(7L), any(), any())).thenThrow(new IllegalArgumentException("rango"));

        mvc.perform(get("/api/agente/metricas").param("desde", "2026-12-10").param("hasta", "2026-12-01"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void fechaMalFormadaEs400() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);

        mvc.perform(get("/api/agente/metricas").param("desde", "ayer")).andExpect(status().isBadRequest());
        verify(service, never()).consultar(any(), any(), any());
    }
}
