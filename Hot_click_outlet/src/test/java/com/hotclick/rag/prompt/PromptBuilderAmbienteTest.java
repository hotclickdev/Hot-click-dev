package com.hotclick.rag.prompt;

import com.hotclick.rag.dto.ProductoContexto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Prompt RAG de ambiente muestra productos")
class PromptBuilderAmbienteTest {

    @Test
    @DisplayName("Con catálogo no vacío instruye mostrar [PRODS:] en el mismo turno")
    void ambiente_muestraProductosSinPreguntarAntes() {
        ProductoContexto sofa = new ProductoContexto(
            1L, "Sofá 3 plazas", "HC-SOFA-1", 150000,
            "Sofá para sala", "https://img", 4,
            "sala,mueble", "Sala y Comedor", "Tela lino", "Armar patas"
        );
        String prompt = new PromptBuilder().construir(
            "HOTCLICK", List.of(sofa), "GENERAL", null, List.of("Sala y Comedor"));

        assertThat(prompt).contains("mostralos YA en este mismo turno");
        assertThat(prompt).contains("[PRODS:");
        assertThat(prompt).contains("<tags>sala,mueble</tags>");
        assertThat(prompt).contains("<categoria>Sala y Comedor</categoria>");
        assertThat(prompt).contains("<especificaciones>Tela lino</especificaciones>");
        assertThat(prompt).contains("<como_usar>Armar patas</como_usar>");
        assertThat(prompt).doesNotContain("antes de mostrar productos");
    }
}
