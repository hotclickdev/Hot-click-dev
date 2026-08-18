package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Prompt del chat público incluye ficha y muestra ambiente")
class PublicChatPromptBuilderTest {

    @Test
    @DisplayName("Lista de productos lleva desc, tags y regla de mostrar ya")
    void fichaYReglaAmbiente() {
        PublicChatPromptBuilder builder = new PublicChatPromptBuilder();
        List<Map<String, Object>> productos = List.of(Map.of(
            "nombre_producto", "Lámpara de pie",
            "precio_venta", 25000,
            "stock_actual", 8,
            "descripcion_corta", "Luz cálida para living",
            "tags", "sala,iluminación",
            "nombre_categoria", "Iluminación"
        ));
        String prompt = builder.buildSalesSystemPrompt(
            "50686667888", "GENERAL", productos, false, false, null, Set.of(), false, true);

        assertThat(prompt).contains("Lámpara de pie");
        assertThat(prompt).contains("tags: sala,iluminación");
        assertThat(prompt).contains("cat: Iluminación");
        assertThat(prompt).contains("recomendálos YA");
    }

    @Test
    @DisplayName("Antes del 3.er turno no empuja fichas")
    void conversacionTemprana_sinEmpujarCatalogo() {
        PublicChatPromptBuilder builder = new PublicChatPromptBuilder();
        String prompt = builder.buildSalesSystemPrompt(
            "50686667888", "GENERAL", List.of(), false, false, null, Set.of(), false, false);
        assertThat(prompt).contains("Es temprano en la charla");
        assertThat(prompt).doesNotContain("recomendálos YA");
    }

    @Test
    @DisplayName("Asesor de ficha pide sí/no/no consta y no convencer")
    void asesorFicha_honestidadSinCatalogo() {
        PublicChatPromptBuilder builder = new PublicChatPromptBuilder();
        Map<String, Object> ficha = new java.util.LinkedHashMap<>();
        ficha.put("nombre_producto", "Taladro percutor");
        ficha.put("especificaciones", "Uso: madera y metal");
        ficha.put("como_usar", "Broca adecuada al material");
        ficha.put("tags", "herramienta");
        ficha.put("garantia_dias", 0);

        String prompt = builder.buildAdvisorSystemPrompt("50686667888", ficha, false, false);

        assertThat(prompt).contains("Taladro percutor");
        assertThat(prompt).contains("Uso: madera y metal");
        assertThat(prompt).contains("NO CONSTA");
        assertThat(prompt).doesNotContain("Convencelo");
        assertThat(prompt).doesNotContain("recomendálos YA");
        assertThat(PublicChatPromptBuilder.formatearFicha(ficha)).contains("no consta");
    }
}
