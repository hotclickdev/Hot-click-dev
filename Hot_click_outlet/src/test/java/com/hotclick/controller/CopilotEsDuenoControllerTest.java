package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.TenantContext;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.ExecutiveDashboardService;
import com.hotclick.service.TextModerationService;
import com.hotclick.service.copilot.AiCopilotRolResolver;
import com.hotclick.service.copilot.AiCopilotStreamProcessor;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Cableado del rol en los DOS puntos de entrada del copilot web: el {@code esDueno} que llega a
 * {@code AiCopilotService.chatStream} sale del rol real (controller → AiCopilotRolResolver), no de una constante.
 */
@DisplayName("Copilot web: los controllers pasan el esDueno real a chatStream")
class CopilotEsDuenoControllerTest {

    private static final long EMPRESA = 7L;
    private static final String CORREO = "usuario@test.invalid";

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final MiembroEmpresaRepository miembros = mock(MiembroEmpresaRepository.class);
    private final AiCopilotService copilot = mock(AiCopilotService.class);
    private final Executor mismoHilo = Runnable::run;
    private MockMvc chatMvc;
    private MockMvc resumenMvc;

    @BeforeEach
    void setUp() {
        TelegramFlujoSupport soporte = new TelegramFlujoSupport();
        ReflectionTestUtils.setField(soporte, "miembroEmpresaRepository", miembros);
        AiCopilotRolResolver resolver = new AiCopilotRolResolver();
        ReflectionTestUtils.setField(resolver, "usuarioRepository", usuarios);
        ReflectionTestUtils.setField(resolver, "flujoSupport", soporte);

        RateLimiter limiter = mock(RateLimiter.class);
        when(limiter.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        TextModerationService moderacion = mock(TextModerationService.class);
        when(moderacion.moderar(any(String[].class))).thenReturn(new TextModerationService.ModerationResult(true, null));

        AiCopilotController chat = new AiCopilotController();
        ReflectionTestUtils.setField(chat, "aiCopilotService", copilot);
        ReflectionTestUtils.setField(chat, "aiQuotaService", mock(AiQuotaService.class));
        ReflectionTestUtils.setField(chat, "rateLimiter", limiter);
        ReflectionTestUtils.setField(chat, "sseExecutor", mismoHilo);
        ReflectionTestUtils.setField(chat, "textModerationService", moderacion);
        ReflectionTestUtils.setField(chat, "streamProcessor", mock(AiCopilotStreamProcessor.class));
        ReflectionTestUtils.setField(chat, "rolResolver", resolver);
        chatMvc = MockMvcBuilders.standaloneSetup(chat).build();

        AiQuotaService cuota = mock(AiQuotaService.class);
        when(cuota.puedeUsarAi(EMPRESA)).thenReturn(true);
        ExecutiveDashboardService dashboard = mock(ExecutiveDashboardService.class);
        when(dashboard.getDashboard(EMPRESA)).thenReturn(Map.of("periodo", "2026-11"));
        ExecutiveController ejecutivo = new ExecutiveController();
        ReflectionTestUtils.setField(ejecutivo, "executiveService", dashboard);
        ReflectionTestUtils.setField(ejecutivo, "aiCopilotService", copilot);
        ReflectionTestUtils.setField(ejecutivo, "aiQuotaService", cuota);
        ReflectionTestUtils.setField(ejecutivo, "rolResolver", resolver);
        ReflectionTestUtils.setField(ejecutivo, "sseExecutor", mismoHilo);
        resumenMvc = MockMvcBuilders.standaloneSetup(ejecutivo).build();

        TenantContext.set(EMPRESA);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(CORREO, "n/a", List.of()));
    }

    @AfterEach
    void limpiar() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    private void membresia(String rol, boolean activa) {
        Usuario u = new Usuario();
        u.setId(5L);
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        u.setEmpresa(e);
        when(usuarios.findByCorreo(CORREO)).thenReturn(Optional.of(u));
        MiembroEmpresa m = new MiembroEmpresa();
        m.setRolEnEmpresa(rol);
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(5L, EMPRESA, 1))
            .thenReturn(activa ? Optional.of(m) : Optional.empty());
        // ex-miembro: la fila existe con estado 0 (no es dueño legado sin filas)
        when(miembros.findByUsuarioIdAndEmpresaId(5L, EMPRESA)).thenReturn(Optional.of(m));
    }

    private boolean esDuenoDelChat() throws Exception {
        chatMvc.perform(post("/api/admin/ai/chat").contentType(MediaType.APPLICATION_JSON)
            .content("{\"message\":\"¿cuánto vendí?\"}"));
        return capturar();
    }

    private boolean esDuenoDelResumen() throws Exception {
        resumenMvc.perform(post("/api/admin/executive/ai-summary"));
        return capturar();
    }

    private boolean capturar() {
        ArgumentCaptor<Boolean> esDueno = ArgumentCaptor.forClass(Boolean.class);
        verify(copilot).chatStream(eq(EMPRESA), anyString(), any(SseEmitter.class), esDueno.capture());
        return esDueno.getValue();
    }

    @Test
    @DisplayName("POST /api/admin/ai/chat: LECTOR → false")
    void chatLector() throws Exception {
        membresia("LECTOR", true);
        assertThat(esDuenoDelChat()).isFalse();
    }

    @Test
    @DisplayName("POST /api/admin/ai/chat: ex-miembro → false")
    void chatExMiembro() throws Exception {
        membresia("PROPIETARIO", false);
        assertThat(esDuenoDelChat()).isFalse();
    }

    @Test
    @DisplayName("POST /api/admin/ai/chat: PROPIETARIO → true")
    void chatPropietario() throws Exception {
        membresia("PROPIETARIO", true);
        assertThat(esDuenoDelChat()).isTrue();
    }

    @Test
    @DisplayName("POST /api/admin/executive/ai-summary: LECTOR → false")
    void resumenLector() throws Exception {
        membresia("LECTOR", true);
        assertThat(esDuenoDelResumen()).isFalse();
    }

    @Test
    @DisplayName("POST /api/admin/executive/ai-summary: ex-miembro → false")
    void resumenExMiembro() throws Exception {
        membresia("PROPIETARIO", false);
        assertThat(esDuenoDelResumen()).isFalse();
    }

    @Test
    @DisplayName("POST /api/admin/executive/ai-summary: PROPIETARIO → true")
    void resumenPropietario() throws Exception {
        membresia("PROPIETARIO", true);
        assertThat(esDuenoDelResumen()).isTrue();
    }
}
