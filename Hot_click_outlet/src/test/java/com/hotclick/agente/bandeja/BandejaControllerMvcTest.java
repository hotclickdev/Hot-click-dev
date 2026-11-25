package com.hotclick.agente.bandeja;

import com.hotclick.agente.metricas.EncuestaService;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BandejaControllerMvcTest {

    private BandejaService service;
    private BandejaAvisoService aviso;
    private CompanyScope scope;
    private TenantService tenant;
    private MockMvc mvc;
    private final UUID id = UUID.randomUUID();

    @BeforeEach
    void init() {
        service = mock(BandejaService.class);
        aviso = mock(BandejaAvisoService.class);
        scope = mock(CompanyScope.class);
        tenant = mock(TenantService.class);
        when(scope.getCurrentUserId()).thenReturn(1L);
        when(tenant.tieneFeature("ai")).thenReturn(true);
        mvc = MockMvcBuilders.standaloneSetup(new BandejaController(service, aviso, scope, tenant))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void listaUsaLaEmpresaDelUsuarioYLosFiltros() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(service.listar(eq(7L), eq(1L), eq(BandejaService.Vista.MIAS), eq("WHATSAPP"), any(), anyInt(), anyInt()))
            .thenReturn(new BandejaDtos.Pagina(List.of(), 0, 20, 0, false));

        mvc.perform(get("/api/bandeja").param("vista", "mias").param("canal", "whatsapp"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void adminUsaAlcanceNuloYNoExigeFeature() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null);
        when(tenant.tieneFeature("ai")).thenReturn(false);
        when(service.resumen(null, 1L)).thenReturn(new BandejaDtos.Resumen(2, 3));

        mvc.perform(get("/api/bandeja/resumen"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.asignadasAMi").value(2));
    }

    @Test
    void negocioSinPlanConIaRecibe403SinTocarElServicio() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(tenant.tieneFeature("ai")).thenReturn(false);

        mvc.perform(get("/api/bandeja")).andExpect(status().isForbidden());
        verify(service, never()).listar(any(), any(), any(), any(), any(), anyInt(), anyInt());
    }

    @Test
    void conversacionDeOtraEmpresaEs404() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(8L);
        when(service.detalle(id, 8L, 1L)).thenThrow(new RecursoNoEncontradoException("Conversación no encontrada"));

        mvc.perform(get("/api/bandeja/" + id + "/mensajes")).andExpect(status().isNotFound());
    }

    @Test
    void responderFueraDeVentanaEs409ConMensajeClaro() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(service.responder(id, 7L, "Hola")).thenThrow(new BandejaConflictoException(BandejaService.MSG_VENTANA));

        mvc.perform(post("/api/bandeja/" + id + "/responder").contentType(MediaType.APPLICATION_JSON)
                .content("{\"texto\":\"Hola\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("24 horas")));
    }

    @Test
    void asignarAOtraPersonaAvisaYAsignarseASiMismoNo() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        BandejaDtos.Conversacion c = new BandejaDtos.Conversacion(id, "INSTAGRAM", "***1234", "PERSONA", "ABIERTA",
            5L, false, null, null, true, null);
        when(service.asignar(id, 7L, 1L, 5L)).thenReturn(c);
        when(service.asignar(id, 7L, 1L, 1L)).thenReturn(c);

        mvc.perform(post("/api/bandeja/" + id + "/asignar").contentType(MediaType.APPLICATION_JSON)
            .content("{\"usuarioId\":5}")).andExpect(status().isOk());
        verify(aviso).avisarAsignacion(5L, "INSTAGRAM");

        mvc.perform(post("/api/bandeja/" + id + "/asignar").contentType(MediaType.APPLICATION_JSON)
            .content("{\"usuarioId\":1}")).andExpect(status().isOk());
        verify(aviso, never()).avisarAsignacion(eq(1L), any());
    }

    @Test
    void vistaOCanalInvalidosSon400() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        mvc.perform(get("/api/bandeja").param("vista", "otra")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/bandeja").param("canal", "sms")).andExpect(status().isBadRequest());
    }

    // ── AG-38 ──────────────────────────────────────────────────────────────────

    @Test
    void notaBajaPideLaVistaDeChatsConNotaBajaDelNegocioDelUsuario() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(service.listarNotaBaja(eq(7L), eq(1L), eq("WHATSAPP"), eq(0), eq(20)))
            .thenReturn(new BandejaDtos.Pagina(List.of(), 0, 20, 3, false));

        mvc.perform(get("/api/bandeja").param("notaBaja", "true").param("canal", "whatsapp"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(3));
        verify(service, never()).listar(any(), any(), any(), any(), any(), anyInt(), anyInt());
    }

    @Test
    void cerrarMandaLaEncuestaConElAlcanceDelUsuario() throws Exception {
        EncuestaService encuesta = mock(EncuestaService.class);
        MockMvc conEncuesta = MockMvcBuilders.standaloneSetup(new BandejaController(service, aviso, scope, tenant, encuesta))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(service.cerrar(id, 7L, 1L)).thenReturn(new BandejaDtos.Conversacion(id, "WHATSAPP", "***1234", "BOT",
            "CERRADA", null, false, null, null, false, null));

        conEncuesta.perform(post("/api/bandeja/" + id + "/cerrar")).andExpect(status().isOk());

        verify(encuesta).enviarAlCerrar(id, 7L);
    }

    @Test
    void siElCierreEsDeOtroNegocioNoSeMandaLaEncuesta() throws Exception {
        EncuestaService encuesta = mock(EncuestaService.class);
        MockMvc conEncuesta = MockMvcBuilders.standaloneSetup(new BandejaController(service, aviso, scope, tenant, encuesta))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(8L);
        when(service.cerrar(id, 8L, 1L)).thenThrow(new RecursoNoEncontradoException("Conversación no encontrada"));

        conEncuesta.perform(post("/api/bandeja/" + id + "/cerrar")).andExpect(status().isNotFound());

        verify(encuesta, never()).enviarAlCerrar(any(), any());
    }
}
