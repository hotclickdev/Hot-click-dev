package com.hotclick.agente.panel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.ventas.ConocimientoRepository;
import com.hotclick.agente.ventas.ConocimientoService;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.exception.EmpresaRequeridaException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.LectorSoloLecturaInterceptor;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.TenantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Aislamiento entre empresas, plan con IA, LECTOR (interceptor real) y simulador del panel del bot. */
class PanelAgenteControllerTest {

    private static final String CFG_JSON = "{\"nombreBot\":\"Tina\",\"trato\":\"USTED\",\"emojis\":false,\"activo\":true,"
        + "\"horarioActivo\":false,\"horario\":[],\"mensajeFueraHorario\":null}";
    private static final String CONOC_JSON = "{\"titulo\":\"Envíos\",\"contenido\":\"Enviamos a todo el país\",\"activo\":true}";
    private static final String SIM_JSON = "{\"mensaje\":\"hola\",\"historial\":[]}";

    private CompanyScope scope;
    private TenantService tenant;
    private PropietarioGuard guard;
    private AgenteConfigService config;
    private ConocimientoService conocimiento;
    private SimuladorService simulador;
    private MockMvc mvc;

    @BeforeEach
    void init() {
        scope = mock(CompanyScope.class);
        tenant = mock(TenantService.class);
        guard = mock(PropietarioGuard.class);
        config = mock(AgenteConfigService.class);
        conocimiento = mock(ConocimientoService.class);
        simulador = mock(SimuladorService.class);
        when(tenant.tieneFeature("ai")).thenReturn(true);
        when(scope.requireEmpresaId()).thenReturn(7L);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(scope.getCurrentUserId()).thenReturn(3L);
        PanelAcceso acceso = new PanelAcceso(scope, tenant);
        LectorSoloLecturaInterceptor lector = new LectorSoloLecturaInterceptor(guard, scope, new ObjectMapper());
        mvc = MockMvcBuilders.standaloneSetup(new AgenteConfigController(config, acceso),
                new ConocimientoController(conocimiento, acceso), new SimuladorController(simulador, acceso))
            .setControllerAdvice(new GlobalExceptionHandler()).addInterceptors(lector).build();
        when(config.obtener(7L)).thenReturn(new AgenteConfigDto("Tina", "USTED", false, true, false, List.of(), null, null));
        when(config.guardar(eq(7L), any())).thenReturn(new AgenteConfigDto("Tina", "USTED", false, true, false, List.of(), null, null));
        when(conocimiento.listar(7L)).thenReturn(List.of(
            new ConocimientoRepository.Fila(1L, 7L, "Envíos", "Todo el país", null, true)));
        when(conocimiento.crear(eq(7L), anyString(), anyString(), any(), anyBoolean())).thenReturn(9L);
        when(simulador.simular(eq(7L), eq(3L), eq("hola"), any()))
            .thenReturn(new SimuladorService.Resultado("Hola", false, "COMPLETO", 10, 5));
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private List<MockHttpServletRequestBuilder> escrituras() {
        return List.of(json(put("/api/agente/config"), CFG_JSON), json(post("/api/agente/conocimiento"), CONOC_JSON),
            json(put("/api/agente/conocimiento/1"), CONOC_JSON), delete("/api/agente/conocimiento/1"),
            json(post("/api/agente/simulador"), SIM_JSON));
    }

    @Test
    void configYConocimientoUsanLaEmpresaDelUsuario() throws Exception {
        mvc.perform(get("/api/agente/config")).andExpect(status().isOk()).andExpect(jsonPath("$.nombreBot").value("Tina"));
        mvc.perform(get("/api/agente/conocimiento")).andExpect(status().isOk()).andExpect(jsonPath("$[0].titulo").value("Envíos"));
        mvc.perform(json(put("/api/agente/config"), CFG_JSON)).andExpect(status().isOk());
        verify(config).guardar(eq(7L), any());
        verify(conocimiento).listar(7L);
    }

    @Test
    void conocimientoDeOtraEmpresaEs404() throws Exception {
        doNoEncontrado();
        mvc.perform(delete("/api/agente/conocimiento/55")).andExpect(status().isNotFound());
        mvc.perform(json(put("/api/agente/conocimiento/55"), CONOC_JSON)).andExpect(status().isNotFound());
        verify(conocimiento).eliminar(55L, 7L); // siempre con la empresa del usuario, no la del id
    }

    private void doNoEncontrado() {
        org.mockito.Mockito.doThrow(new RecursoNoEncontradoException("Conocimiento no encontrado"))
            .when(conocimiento).eliminar(eq(55L), any());
        org.mockito.Mockito.doThrow(new RecursoNoEncontradoException("Conocimiento no encontrado"))
            .when(conocimiento).actualizar(eq(55L), any(), anyString(), anyString(), any(), anyBoolean());
    }

    @Test
    void planSinIaRecibe403EnTodo() throws Exception {
        when(tenant.tieneFeature("ai")).thenReturn(false);
        mvc.perform(get("/api/agente/config")).andExpect(status().isForbidden());
        mvc.perform(get("/api/agente/conocimiento")).andExpect(status().isForbidden());
        mvc.perform(json(post("/api/agente/simulador"), SIM_JSON)).andExpect(status().isForbidden());
        verify(simulador, never()).simular(any(), any(), any(), any());
    }

    @Test
    void adminSinImpersonarNoUsaConfigNiSimuladorPeroSiElConocimientoDeHotClick() throws Exception {
        when(scope.requireEmpresaId()).thenThrow(new EmpresaRequeridaException());
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null);
        when(tenant.tieneFeature("ai")).thenReturn(false);
        when(conocimiento.listar(null)).thenReturn(List.of());

        mvc.perform(get("/api/agente/config")).andExpect(status().isForbidden());
        mvc.perform(json(post("/api/agente/simulador"), SIM_JSON)).andExpect(status().isForbidden());
        mvc.perform(get("/api/agente/conocimiento")).andExpect(status().isOk());
    }

    @Test
    void lectorRecibe403EnCadaEscrituraYPuedeLeer() throws Exception {
        when(guard.esLector(7L)).thenReturn(true);
        for (MockHttpServletRequestBuilder b : escrituras()) mvc.perform(b).andExpect(status().isForbidden());
        verify(config, never()).guardar(any(), any());
        verify(conocimiento, never()).crear(any(), anyString(), anyString(), any(), anyBoolean());
        verify(conocimiento, never()).actualizar(any(), any(), anyString(), anyString(), any(), anyBoolean());
        verify(conocimiento, never()).eliminar(any(), any());
        verify(simulador, never()).simular(any(), any(), any(), any());
        mvc.perform(get("/api/agente/config")).andExpect(status().isOk());
        mvc.perform(get("/api/agente/conocimiento")).andExpect(status().isOk());
    }

    @Test
    void editorSiPuedeEscribirYSimular() throws Exception {
        mvc.perform(json(post("/api/agente/conocimiento"), CONOC_JSON)).andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(9));
        mvc.perform(json(post("/api/agente/simulador"), SIM_JSON)).andExpect(status().isOk())
            .andExpect(jsonPath("$.texto").value("Hola"));
    }

    @Test
    void simuladorConTopeAlcanzadoEs429() throws Exception {
        when(simulador.simular(any(), any(), any(), any())).thenThrow(new SimuladorService.LimiteSimuladorException());
        mvc.perform(json(post("/api/agente/simulador"), SIM_JSON)).andExpect(status().isTooManyRequests());
    }

    @Test
    void conocimientoInvalidoEs400() throws Exception {
        when(conocimiento.crear(eq(7L), anyString(), anyString(), any(), anyBoolean()))
            .thenThrow(new IllegalArgumentException("Título obligatorio"));
        mvc.perform(json(post("/api/agente/conocimiento"), CONOC_JSON)).andExpect(status().isBadRequest());
    }
}
