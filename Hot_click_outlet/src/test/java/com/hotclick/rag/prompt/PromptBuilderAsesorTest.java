package com.hotclick.rag.prompt;

import com.hotclick.rag.dto.ProductoContexto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Prompt RAG de asesor de ficha")
class PromptBuilderAsesorTest {

    @Test
    @DisplayName("Con productoId no pide mostrar catálogo ni categorías")
    void asesor_noRebuscaCatalogo() {
        ProductoContexto taladro = new ProductoContexto(
            9L, "Taladro percutor", "HC-TAL-1", 45000,
            "Taladro de impacto", "https://img", 3,
            "herramienta", "Herramientas", "Uso: madera y metal", "Elegir broca"
        );
        String prompt = new PromptBuilder().construir(
            "HOTCLICK", List.of(taladro), "PRODUCTO:Taladro percutor:45000:Taladro",
            null, List.of("Cocina", "Sala"), true);

        assertThat(prompt).contains("NO CONSTA");
        assertThat(prompt).contains("Uso: madera y metal");
        assertThat(prompt).contains("honestidad_ficha");
        assertThat(prompt).doesNotContain("<categoria>Cocina</categoria>");
        assertThat(prompt).doesNotContain("<categoria>Sala</categoria>");
    }
}
