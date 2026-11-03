package com.hotclick.rag.controller.shoppingassistant;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.controller.ShoppingAssistantController;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.shoppingassistant.ShoppingAssistantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** MEDIO-A (área 6): BD caída al resolver el tenant → contingencia 200/204, nunca 500. */
class ShoppingAssistantTenantBdCaidaTest {

    private final EmpresaRepository repo = mock(EmpresaRepository.class);
    private final ShoppingAssistantService service = mock(ShoppingAssistantService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        when(repo.findBySlug(anyString())).thenThrow(new DataAccessResourceFailureException("pool agotado"));
        mvc = MockMvcBuilders.standaloneSetup(new ShoppingAssistantController(service,
                mock(AssistantMetricsService.class), new ShoppingAssistantTenantGuard(repo),
                mock(ShoppingAssistantImageSearchHandler.class)))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    @DisplayName("chat → 200 con respuesta de contingencia")
    void chat() throws Exception {
        mvc.perform(post("/api/public/shopping-assistant/chat").contentType(MediaType.APPLICATION_JSON)
                .content("{\"mensaje\":\"hola\",\"empresaSlug\":\"tienda\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.respuesta").isNotEmpty());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("historial → 200 vacío")
    void historial() throws Exception {
        mvc.perform(get("/api/public/shopping-assistant/session/abc/history").param("empresaSlug", "tienda"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mensajes").isEmpty());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("borrado de sesión → 204")
    void borrado() throws Exception {
        mvc.perform(delete("/api/public/shopping-assistant/session/abc").param("empresaSlug", "tienda"))
            .andExpect(status().isNoContent());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("feedback → 204")
    void feedback() throws Exception {
        mvc.perform(post("/api/public/shopping-assistant/feedback").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sesionId\":\"abc\",\"msgIndex\":0,\"rating\":1,\"empresaSlug\":\"tienda\"}"))
            .andExpect(status().isNoContent());
        verifyNoInteractions(service);
    }
}
