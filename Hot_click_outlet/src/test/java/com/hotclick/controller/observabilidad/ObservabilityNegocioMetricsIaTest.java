package com.hotclick.controller.observabilidad;

import com.hotclick.repository.AiUsoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Observabilidad IA — costo con precio Haiku 4.5 y cache")
class ObservabilityNegocioMetricsIaTest {

    @Mock AiUsoRepository aiUsoRepository;
    @InjectMocks ObservabilityNegocioMetrics metrics;

    @Test
    @DisplayName("1M in + 1M out + 1M cache lectura + 1M cache escritura = US$7.35 (no 4.80 de Haiku 3.5)")
    void costoMensualUsaHaiku45ConCache() {
        when(aiUsoRepository.sumTokensEntradaGlobales(anyInt(), anyInt())).thenReturn(1_000_000L);
        when(aiUsoRepository.sumTokensSalidaGlobales(anyInt(), anyInt())).thenReturn(1_000_000L);
        when(aiUsoRepository.sumTokensCacheLecturaGlobales(anyInt(), anyInt())).thenReturn(1_000_000L);
        when(aiUsoRepository.sumTokensCacheEscrituraGlobales(anyInt(), anyInt())).thenReturn(1_000_000L);
        when(aiUsoRepository.sumLlamadasGlobales(anyInt(), anyInt())).thenReturn(10L);
        when(aiUsoRepository.sumTokensEntradaAcumulados()).thenReturn(1_000_000L);
        when(aiUsoRepository.sumTokensSalidaAcumulados()).thenReturn(1_000_000L);
        when(aiUsoRepository.sumTokensCacheLecturaAcumulados()).thenReturn(0L);
        when(aiUsoRepository.sumTokensCacheEscrituraAcumulados()).thenReturn(0L);
        when(aiUsoRepository.findTopConsumoMes(anyInt(), anyInt()))
            .thenReturn(List.<Object[]>of(new Object[]{"Tienda", 4L, 1_000_000L, 1_000_000L, 0L, 0L}));

        Map<String, Object> ia = metrics.ia();

        assertThat(ia.get("costoEstimadoUSD")).isEqualTo(String.format("$%.4f", 7.35));
        assertThat(ia.get("costoAcumuladoUSD")).isEqualTo(String.format("$%.2f", 6.00));
        assertThat(ia.get("tokensCacheLecturaMes")).isEqualTo(1_000_000L);
        assertThat(ia.get("tokensMes")).isEqualTo(4_000_000L);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> top = (List<Map<String, Object>>) ia.get("topEmpresas");
        assertThat(top.get(0).get("costoUSD")).isEqualTo(String.format("$%.4f", 6.00));
    }
}
