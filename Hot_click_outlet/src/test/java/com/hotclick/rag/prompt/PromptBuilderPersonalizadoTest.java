package com.hotclick.rag.prompt;

import com.hotclick.rag.dto.ProductoContexto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Prompt RAG con productos personalizados")
class PromptBuilderPersonalizadoTest {

    @Test
    @DisplayName("Cotización en catálogo no muestra ₡1 y marca personalizado")
    void cotizacion_sinUno() {
        ProductoContexto cuadro = new ProductoContexto(
            3L, "Cuadro personalizado", "ART-1", null,
            "Con tu foto", "https://img", 0,
            "arte", "Arte", "Canvas 40x60", "Colgar en pared seca",
            true, "COTIZACION", null, null, "Subí 1-3 fotos",
            "A cotizar"
        );
        String prompt = new PromptBuilder().construir(
            "Arte CR", List.of(cuadro), "GENERAL", null, List.of("Arte"));

        assertThat(prompt).contains("<precio>A cotizar</precio>");
        assertThat(prompt).contains("<personalizado>sí</personalizado>");
        assertThat(prompt).contains("<modo_precio>COTIZACION</modo_precio>");
        assertThat(prompt).contains("por encargo");
        assertThat(prompt).contains("Canvas 40x60");
        assertThat(prompt).contains("STOCK Y DISPONIBILIDAD");
        assertThat(prompt).doesNotContain("<precio>₡1</precio>");
        assertThat(prompt).doesNotContain("<disponibilidad>agotado</disponibilidad>");
    }

    @Test
    @DisplayName("Post-pago usa nombre de la tienda, no HOTCLICK fijo")
    void pagoExito_nombreTienda() {
        String prompt = new PromptBuilder().construir(
            "Cafe Arte", List.of(), "PAGO_EXITO:SINPE:42", null, List.of());
        assertThat(prompt).contains("equipo de Cafe Arte");
        assertThat(prompt).doesNotContain("equipo de HOTCLICK");
    }
}
