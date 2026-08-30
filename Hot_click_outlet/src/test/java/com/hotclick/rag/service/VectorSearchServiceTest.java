package com.hotclick.rag.service;

import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.service.catalogo.ChatRankingConstants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Fusión RRF y umbral de distancia del chat")
class VectorSearchServiceTest {

    @Test
    @DisplayName("RRF prioriza productos que aparecen en ambas listas")
    void fusionRrf_priorizaInterseccion() {
        ProductoContexto a = producto(1L, "A");
        ProductoContexto b = producto(2L, "B");
        ProductoContexto c = producto(3L, "C");

        List<ProductoContexto> fused = VectorSearchService.fusionRrf(
            List.of(a, b), List.of(b, c), 3);

        assertThat(fused).hasSize(3);
        assertThat(fused.get(0).id()).isEqualTo(2L);
    }

    @Test
    @DisplayName("Umbral de distancia coseno está definido y es estricto")
    void umbralDistancia() {
        assertThat(ChatRankingConstants.CHAT_DISTANCIA_MAXIMA).isBetween(0.3, 0.8);
        assertThat(ChatRankingConstants.RRF_K).isEqualTo(60);
    }

    private static ProductoContexto producto(long id, String nombre) {
        return new ProductoContexto(id, nombre, "SKU-" + id, 1000, "", null, 5, "", "", "", "");
    }
}
