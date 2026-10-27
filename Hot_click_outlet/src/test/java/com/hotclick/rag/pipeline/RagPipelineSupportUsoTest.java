package com.hotclick.rag.pipeline;

import com.hotclick.service.ai.UsoTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RagPipelineSupport — tokens de la respuesta")
class RagPipelineSupportUsoTest {

    @Test
    @DisplayName("parseClaudeText conserva entrada, salida y cache en el RagResult")
    void conservaCache() {
        RagResult r = RagPipelineSupport.parseClaudeText("Hola [OPTS:a,b]", List.of(),
            new UsoTokens(100, 20, 5000L, 300L));
        assertThat(r.uso()).isEqualTo(new UsoTokens(100, 20, 5000L, 300L));
        assertThat(r.opts()).containsExactly("a", "b");
    }

    @Test
    @DisplayName("La firma vieja (in, out) sigue funcionando con cache en 0")
    void firmaLegada() {
        RagResult r = RagPipelineSupport.parseClaudeText("Hola", List.of(), 7, 3);
        assertThat(r.uso()).isEqualTo(UsoTokens.de(7, 3));
        assertThat(r.tokensCacheLectura()).isZero();
    }
}
