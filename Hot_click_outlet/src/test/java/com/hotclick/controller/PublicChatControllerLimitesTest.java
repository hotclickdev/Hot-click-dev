package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.PublicChatRequest;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.PublicChatService;
import com.hotclick.service.TextModerationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.concurrent.Executor;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Chat público — límites por visitante y tope de costo por empresa")
class PublicChatControllerLimitesTest {

    private static final long EMPRESA_ID = 7L;

    private PublicChatController controller;
    private PublicChatService chatService;
    private RateLimiter rateLimiter;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        controller = new PublicChatController();
        chatService = mock(PublicChatService.class);
        rateLimiter = mock(RateLimiter.class);

        EmpresaRepository empresas = mock(EmpresaRepository.class);
        Empresa empresa = new Empresa();
        empresa.setId(EMPRESA_ID);
        when(empresas.findBySlug("tienda")).thenReturn(Optional.of(empresa));

        TextModerationService moderacion = mock(TextModerationService.class);
        when(moderacion.moderar(any(String[].class)))
            .thenReturn(new TextModerationService.ModerationResult(true, null));

        ClientIpResolver ips = mock(ClientIpResolver.class);
        when(ips.resolve(any())).thenReturn("203.0.113.9");

        Executor directo = Runnable::run;
        ReflectionTestUtils.setField(controller, "chatService", chatService);
        ReflectionTestUtils.setField(controller, "empresaRepository", empresas);
        ReflectionTestUtils.setField(controller, "rateLimiter", rateLimiter);
        ReflectionTestUtils.setField(controller, "clientIpResolver", ips);
        ReflectionTestUtils.setField(controller, "sseExecutor", directo);
        ReflectionTestUtils.setField(controller, "textModerationService", moderacion);
        ReflectionTestUtils.setField(controller, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(controller, "maxDiarioVisitante", 60);
        ReflectionTestUtils.setField(controller, "maxDiarioEmpresa", 3000);
        request = new MockHttpServletRequest();
    }

    @Test
    @DisplayName("Dentro de ambos límites: responde con el modelo")
    void dentroDeLimites_usaModelo() {
        when(rateLimiter.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);

        controller.chat("tienda", mensaje("una lampara"), request);

        verify(chatService).chat(eq(EMPRESA_ID), anyBoolean(), eq("una lampara"), anyInt(), any(), any(), any(), any(),
            eq(true), any());
    }

    @Test
    @DisplayName("Tope de empresa superado: sigue respondiendo, pero sin modelo")
    void topeEmpresa_degradaSinCortar() {
        when(rateLimiter.tryAcquire(startsWith("public_chat:ip:"), anyInt(), anyInt())).thenReturn(true);
        when(rateLimiter.tryAcquire(startsWith("empresa:"), anyInt(), anyInt())).thenReturn(false);

        controller.chat("tienda", mensaje("una lampara"), request);

        verify(chatService).chat(eq(EMPRESA_ID), anyBoolean(), eq("una lampara"), anyInt(), any(), any(), any(), any(),
            eq(false), any());
    }

    @Test
    @DisplayName("Visitante sobre su límite diario: se corta solo para él y no consume el tope de empresa")
    void limiteVisitante_corta() {
        when(rateLimiter.tryAcquire(startsWith("public_chat:ip:203.0.113.9"), anyInt(), anyInt())).thenReturn(false);

        controller.chat("tienda", mensaje("una lampara"), request);

        verifyNoInteractions(chatService);
        verify(rateLimiter, never()).tryAcquire(startsWith("empresa:"), anyInt(), anyInt());
    }

    private static PublicChatRequest mensaje(String texto) {
        PublicChatRequest body = new PublicChatRequest();
        body.setMessage(texto);
        return body;
    }
}
