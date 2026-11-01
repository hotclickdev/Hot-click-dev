package com.hotclick.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.AiQuotaService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("ClaudeUsoRegistrador")
class ClaudeUsoRegistradorTest {

    private final AiQuotaService quota = mock(AiQuotaService.class);
    private final ClaudeUsoRegistrador registrador = new ClaudeUsoRegistrador(quota);

    @Test
    @DisplayName("Registra el usage de la respuesta en la empresa indicada")
    void registraEnEmpresa() throws Exception {
        var usage = new ObjectMapper().readTree(
            "{\"input_tokens\":10,\"output_tokens\":4,\"cache_read_input_tokens\":7}");
        registrador.registrar(5L, usage);
        verify(quota).actualizarTokens(5L, new UsoTokens(10, 4, 7L, 0L));
    }

    @Test
    @DisplayName("Sin tenant el costo va a la plataforma")
    void sinTenantVaALaPlataforma() {
        registrador.registrar(null, UsoTokens.de(1, 1));
        verify(quota).actualizarTokens(Constants.EMPRESA_PLATAFORMA_ID, UsoTokens.de(1, 1));
    }

    @Test
    @DisplayName("Uso vacio no escribe")
    void vacioNoEscribe() {
        registrador.registrar(5L, UsoTokens.VACIO);
        verifyNoInteractions(quota);
    }

    @Test
    @DisplayName("Si la BD falla no propaga la excepcion (no tumba la respuesta al usuario)")
    void noPropagaErrores() {
        doThrow(new IllegalStateException("db caida")).when(quota).actualizarTokens(any(), any(UsoTokens.class));
        registrador.registrar(5L, UsoTokens.de(1, 1));
    }
}
