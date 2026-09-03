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
            "50686667888", "HOTCLICK", true, "GENERAL", productos, false, false, null, Set.of(), false, true);

        assertThat(prompt).contains("Lámpara de pie");
        assertThat(prompt).contains("tags: sala,iluminación");
        assertThat(prompt).contains("cat: Iluminación");
        assertThat(prompt).contains("conectalos en 1 frase");
        assertThat(prompt).contains("asesor de ventas de HOTCLICK");
    }

    @Test
    @DisplayName("Sin fichas no empuja catálogo")
    void sinFichas_sinEmpujarCatalogo() {
        PublicChatPromptBuilder builder = new PublicChatPromptBuilder();
        String prompt = builder.buildSalesSystemPrompt(
            "50686667888", "Mi Tienda", false, "GENERAL", List.of(), false, false, null, Set.of(), false, false);
        assertThat(prompt).contains("No hay tarjetas en pantalla");
        assertThat(prompt).doesNotContain("conectalos en 1 frase");
        assertThat(prompt).contains("asesor de ventas de Mi Tienda");
        assertThat(prompt).doesNotContain("Garantía: 30 días");
    }

    @Test
    @DisplayName("Tenant no inventa política global de 30 días")
    void tenant_sinGarantiaGlobal() {
        PublicChatPromptBuilder builder = new PublicChatPromptBuilder();
        String info = builder.businessInfoText("50611112222", "Cafe Arte", false, false);
        assertThat(info).contains("Cafe Arte");
        assertThat(info).doesNotContain("garantía de 30");
        assertThat(info).contains("WhatsApp");
    }

    @Test
    @DisplayName("Cotización en lista no muestra ₡1")
    void personalizadoCotizacion_sinUno() {
        PublicChatPromptBuilder builder = new PublicChatPromptBuilder();
        List<Map<String, Object>> productos = List.of(Map.of(
            "nombre_producto", "Cuadro a medida",
            "precio_venta", 1,
            "stock_actual", 0,
            "es_personalizado", true,
            "modo_precio_personalizado", "COTIZACION",
            "descripcion_corta", "Con tu foto",
            "especificaciones", "Tela canvas 40x60",
            "tags", "arte",
            "nombre_categoria", "Arte"
        ));
        String prompt = builder.buildSalesSystemPrompt(
            "50686667888", "Arte CR", false, "GENERAL", productos, false, false, null, Set.of(), false, true);
        assertThat(prompt).contains("A cotizar");
        assertThat(prompt).contains("personalizado=sí");
        assertThat(prompt).contains("por encargo");
        assertThat(prompt).contains("Cuadro a medida — A cotizar | disponibilidad: por encargo");
        assertThat(prompt).doesNotContain("Cuadro a medida — A cotizar | disponibilidad: agotado");
        assertThat(prompt).doesNotContain("— ₡1");
        assertThat(prompt).contains("specs: Tela canvas");
        assertThat(prompt).contains("CONOCÉ EL PRODUCTO");
        assertThat(prompt).contains("NUNCA inventes");
    }

    @Test
    @DisplayName("Stock disponible se reporta sin inventar agotado")
    void stockDisponible_noAgotadoFalso() {
        PublicChatPromptBuilder builder = new PublicChatPromptBuilder();
        List<Map<String, Object>> productos = List.of(Map.of(
            "nombre_producto", "Parlante",
            "precio_venta", 20000,
            "stock_disponible", 12,
            "descripcion_corta", "Bluetooth",
            "especificaciones", "IPX5",
            "tags", "audio",
            "nombre_categoria", "Tecnología"
        ));
        String prompt = builder.buildSalesSystemPrompt(
            "50686667888", "HOTCLICK", true, "GENERAL", productos, false, false, null, Set.of(), false, true);
        assertThat(prompt).contains("stock: 12 disponible");
        assertThat(prompt).contains("specs: IPX5");
        assertThat(prompt).doesNotContain("disponibilidad: agotado");
        assertThat(prompt).doesNotContain("ÚLTIMAS");
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

        String prompt = builder.buildAdvisorSystemPrompt(
            "50686667888", "HOTCLICK", true, ficha, false, false);

        assertThat(prompt).contains("Taladro percutor");
        assertThat(prompt).contains("Uso: madera y metal");
        assertThat(prompt).contains("NO CONSTA");
        assertThat(prompt).doesNotContain("Convencelo");
        assertThat(prompt).doesNotContain("conectalos en 1 frase");
        assertThat(PublicChatPromptBuilder.formatearFicha(ficha)).contains("no consta");
    }
}
