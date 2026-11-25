package com.hotclick.agente.conexion;

import com.hotclick.agente.canal.CanalCuentaDto;
import com.hotclick.agente.conexion.ConexionDtos.ConexionResultado;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.TenantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConexionMetaControllerTest {

    private ConexionMetaService service;
    private CompanyScope scope;
    private TenantService tenant;
    private PropietarioGuard guard;
    private MockMvc mvc;

    private static final String WA = "{\"code\":\"CODE-1\",\"phoneNumberId\":\"111222\",\"wabaId\":\"999888\"}";

    @BeforeEach
    void init() {
        service = mock(ConexionMetaService.class);
        scope = mock(CompanyScope.class);
        tenant = mock(TenantService.class);
        guard = mock(PropietarioGuard.class);
        when(tenant.tieneFeature("ai")).thenReturn(true);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(true);
        mvc = MockMvcBuilders.standaloneSetup(new ConexionMetaController(service, scope, tenant, guard))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    private static ConexionResultado resultado() {
        return new ConexionResultado(List.of(new CanalCuentaDto(1L, "WHATSAPP", 7L, "111222", "999888", "Luna",
            "ACTIVA", true, null)), List.of());
    }

    @Test
    void propietarioConectaConSuPropiaEmpresa() throws Exception {
        when(service.conectarWhatsapp(eq(7L), any())).thenReturn(resultado());
        mvc.perform(post("/api/agente/conexion/whatsapp").contentType(MediaType.APPLICATION_JSON).content(WA))
            .andExpect(status().isOk()).andExpect(jsonPath("$.cuentas[0].tipo").value("WHATSAPP"))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("TOK"))));
    }

    @Test
    void adminDeEquipoTambienPuede() throws Exception {
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(false);
        when(guard.esAdminEquipo(7L)).thenReturn(true);
        when(service.conectarWhatsapp(eq(7L), any())).thenReturn(resultado());
        mvc.perform(post("/api/agente/conexion/whatsapp").contentType(MediaType.APPLICATION_JSON).content(WA))
            .andExpect(status().isOk());
    }

    @Test
    void editorLectorOCajeroRecibe403SinTocarElServicio() throws Exception {
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(false);
        when(guard.esAdminEquipo(7L)).thenReturn(false);
        mvc.perform(post("/api/agente/conexion/whatsapp").contentType(MediaType.APPLICATION_JSON).content(WA))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/agente/conexion/meta-paginas").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"x\",\"paginaId\":\"12345\"}")).andExpect(status().isForbidden());
        verify(service, never()).conectarWhatsapp(any(), any());
        verify(service, never()).conectarPagina(any(), any(), any());
    }

    @Test
    void sinPlanConIaRecibe403() throws Exception {
        when(tenant.tieneFeature("ai")).thenReturn(false);
        mvc.perform(post("/api/agente/conexion/whatsapp").contentType(MediaType.APPLICATION_JSON).content(WA))
            .andExpect(status().isForbidden());
        verify(service, never()).conectarWhatsapp(any(), any());
    }

    @Test
    void adminConectaCuentasDeHotClickConAlcanceNuloYSinFeature() throws Exception {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null);
        when(tenant.tieneFeature("ai")).thenReturn(false);
        when(service.conectarWhatsapp(eq(null), any())).thenReturn(resultado());
        mvc.perform(post("/api/agente/conexion/whatsapp").contentType(MediaType.APPLICATION_JSON).content(WA))
            .andExpect(status().isOk());
    }

    @Test
    void sinConfiguracionResponde503ConMensajeClaro() throws Exception {
        when(service.conectarWhatsapp(any(), any())).thenThrow(new ConexionNoConfiguradaException());
        mvc.perform(post("/api/agente/conexion/whatsapp").contentType(MediaType.APPLICATION_JSON).content(WA))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Pendiente de configurar por HotClick")));
    }

    @Test
    void errorDeMetaEs502SinTextoDeMeta() throws Exception {
        when(service.conectarPagina(any(), any(), any())).thenThrow(new MetaRechazoException(190));
        mvc.perform(post("/api/agente/conexion/meta-paginas").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"x\",\"paginaId\":\"12345\"}"))
            .andExpect(status().isBadGateway());
    }

    @Test
    void cuerpoInvalidoEs400() throws Exception {
        mvc.perform(post("/api/agente/conexion/whatsapp").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"c\",\"phoneNumberId\":\"abc\",\"wabaId\":\"999888\"}"))
            .andExpect(status().isBadRequest());
        verify(service, never()).conectarWhatsapp(any(), any());
    }

    @Test
    void configPublicaNoLlevaSecreto() throws Exception {
        when(service.configPublica()).thenReturn(new ConexionDtos.ConfigPublica(true, false, "APP-1", "CFG", "", "v23.0"));
        mvc.perform(get("/api/agente/conexion/config")).andExpect(status().isOk())
            .andExpect(jsonPath("$.appId").value("APP-1"))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsStringIgnoringCase("secret"))));
    }
}
