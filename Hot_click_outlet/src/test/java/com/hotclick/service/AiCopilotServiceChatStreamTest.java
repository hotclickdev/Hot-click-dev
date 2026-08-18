package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.copilot.AiCopilotClaudeClient;
import com.hotclick.service.copilot.AiCopilotContextBuilder;
import com.hotclick.service.copilot.AiCopilotCrossSellService;
import com.hotclick.service.copilot.AiCopilotHistoryService;
import com.hotclick.service.copilot.AiCopilotMessageStore;
import com.hotclick.service.copilot.AiCopilotStreamProcessor;
import com.hotclick.service.copilot.AiCopilotSuggestionsService;
import com.hotclick.service.copilot.AiCopilotSyncChatService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("chatStream admin usa Claude sin tools de mutación")
class AiCopilotServiceChatStreamTest {

    @Mock AiQuotaService aiQuotaService;
    @Mock EmpresaRepository empresaRepository;
    @Mock AiCopilotContextBuilder contextBuilder;
    @Mock AiCopilotStreamProcessor streamProcessor;
    @Mock AiCopilotSuggestionsService suggestionsService;
    @Mock AiCopilotHistoryService historyService;
    @Mock AiCopilotMessageStore messageStore;
    @Mock AiCopilotSyncChatService syncChatService;
    @Mock AiCopilotCrossSellService crossSellService;

    @InjectMocks AiCopilotService service;

    @Test
    @DisplayName("Panel llama completarConClaude(..., puedeGestionar=false)")
    void chatStream_sinMutaciones() throws Exception {
        Empresa empresa = new Empresa();
        SseEmitter emitter = new SseEmitter();
        when(aiQuotaService.verificarYReservar(7L)).thenReturn(true);
        when(syncChatService.claudeDisponible()).thenReturn(true);
        when(empresaRepository.findById(7L)).thenReturn(Optional.of(empresa));
        when(syncChatService.completarConClaude(eq(7L), eq(empresa), eq("ventas de hoy"), isNull(), eq(false)))
            .thenReturn(new AiCopilotClaudeClient.ResultadoLoopClaude("Hoy ₡50.000", 10, 20, null));
        when(streamProcessor.startHeartbeat(emitter)).thenReturn(() -> { });

        service.chatStream(7L, "ventas de hoy", emitter);

        verify(syncChatService).completarConClaude(7L, empresa, "ventas de hoy", null, false);
        verify(streamProcessor).streamText(emitter, "Hoy ₡50.000");
        verify(messageStore).saveMsg(empresa, "assistant", "Hoy ₡50.000", 20);
    }
}
