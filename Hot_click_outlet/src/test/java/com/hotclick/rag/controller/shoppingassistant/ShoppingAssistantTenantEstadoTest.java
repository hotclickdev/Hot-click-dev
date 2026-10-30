package com.hotclick.rag.controller.shoppingassistant;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.model.Empresa;
import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.controller.ShoppingAssistantController;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.shoppingassistant.ShoppingAssistantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** BAJO (área 6): tienda inexistente o inactiva → 404, nunca 500 del catch genérico. */
class ShoppingAssistantTenantEstadoTest {

    private final EmpresaRepository repo = mock(EmpresaRepository.class);
    private final ShoppingAssistantService service = mock(ShoppingAssistantService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        when(repo.findBySlug(anyString())).thenReturn(Optional.empty());
        mvc = MockMvcBuilders.standaloneSetup(new ShoppingAssistantController(service,
                mock(AssistantMetricsService.class), new ShoppingAssistantTenantGuard(repo),
                mock(ShoppingAssistantImageSearchHandler.class)))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    @DisplayName("chat con slug inexistente → 404 y no llama al asistente")
    void chat_slugInexistente_404() throws Exception {
        mvc.perform(post("/api/public/shopping-assistant/chat").contentType(MediaType.APPLICATION_JSON)
                .content("{\"mensaje\":\"hola\",\"empresaSlug\":\"no-existe\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Tienda no encontrada o inactiva"));
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("chat con tienda INACTIVA → 404")
    void chat_tiendaInactiva_404() throws Exception {
        Empresa e = mock(Empresa.class);
        when(e.getEstadoEmpresa()).thenReturn("INACTIVO");
        when(repo.findBySlug("dormida")).thenReturn(Optional.of(e));
        mvc.perform(post("/api/public/shopping-assistant/chat").contentType(MediaType.APPLICATION_JSON)
                .content("{\"mensaje\":\"hola\",\"empresaSlug\":\"dormida\"}"))
            .andExpect(status().isNotFound());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("historial, expirar y feedback con slug inexistente → 404")
    void otrosEndpoints_slugInexistente_404() throws Exception {
        String sid = "00000000-0000-4000-8000-000000000000";
        mvc.perform(get("/api/public/shopping-assistant/session/" + sid + "/history").param("empresaSlug", "no-existe"))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/public/shopping-assistant/session/" + sid).param("empresaSlug", "no-existe"))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/public/shopping-assistant/feedback").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sesionId\":\"" + sid + "\",\"msgIndex\":0,\"rating\":1,\"empresaSlug\":\"no-existe\"}"))
            .andExpect(status().is4xxClientError());
        verify(service, never()).getSessionHistory(anyString(), any());
    }
}
