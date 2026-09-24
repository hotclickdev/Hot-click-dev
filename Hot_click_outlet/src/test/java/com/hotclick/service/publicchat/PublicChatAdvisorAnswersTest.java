package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Asesor de ficha responde con datos del producto")
class PublicChatAdvisorAnswersTest {

    private final PublicChatAdvisorAnswers answers =
        new PublicChatAdvisorAnswers(new PublicChatIntentHelper());

    @Test
    @DisplayName("Color: usa indicaciones y descripción, no el texto genérico")
    void color_desdeFicha() {
        String r = answers.responder(chaqueta(), "de que color es", false);

        assertThat(r).contains("verde");
        assertThat(r).contains("azul");
        assertThat(r).contains("negro");
        assertThat(r).doesNotContain("Te oriento con la ficha");
    }

    @Test
    @DisplayName("Qué es: usa la descripción corta")
    void queEs_descripcion() {
        String r = answers.responder(caja(), "que es", false);

        assertThat(r).contains("Caja");
        assertThat(r).doesNotContain("Te oriento con la ficha");
        assertThat(r).doesNotContain("Preguntame para qué");
    }

    @Test
    @DisplayName("Cómo se usa: campo como_usar; si falta, no inventa")
    void comoSeUsa_noConstaSiVacio() {
        String r = answers.responder(caja(), "como se usa", false);

        assertThat(r).contains("no indica");
        assertThat(r).doesNotContain("Te oriento con la ficha");
    }

    @Test
    @DisplayName("Cómo se usa: cita el campo de la ficha")
    void comoSeUsa_desdeFicha() {
        Map<String, Object> ficha = chaqueta();
        ficha.put("como_usar", "Poné talla de pecho y altura; elegí verde, azul o negro.");
        String r = answers.responder(ficha, "como se usa", false);

        assertThat(r).contains("talla de pecho");
    }

    @Test
    @DisplayName("Garantía: días de la ficha")
    void garantia_diasDeFicha() {
        String r = answers.responder(caja(), "garantia", false);

        assertThat(r).contains("40");
        assertThat(r).doesNotContain("Te oriento con la ficha");
    }

    @Test
    @DisplayName("Garantía 0: dice que no consta")
    void garantia_noConsta() {
        Map<String, Object> ficha = caja();
        ficha.put("garantia_dias", 0);
        String r = answers.responder(ficha, "tiene garantia", false);

        assertThat(r).contains("no consta");
    }

    @Test
    @DisplayName("Saludo: presenta el producto, no pide que pregunten de nuevo")
    void hola_presentaProducto() {
        String r = answers.responder(chaqueta(), "hola", false);

        assertThat(r).contains("Chaqueta de senderismo a medida");
        assertThat(r).contains("montaña");
        assertThat(r).doesNotContain("Preguntame para qué lo querés");
    }

    @Test
    @DisplayName("Dato ausente: no inventa color")
    void color_noConsta() {
        String r = answers.responder(caja(), "de que color es", false);

        assertThat(r).contains("no indica");
        assertThat(r).doesNotContain("verde");
    }

    @Test
    @DisplayName("El mock de catálogo no cambia")
    void catalogo_mockIntacto() {
        PublicChatMockResponses mocks = new PublicChatMockResponses(answers);
        String r = mocks.generarRespuestaMock(
            List.of(Map.of("nombre_producto", "Caja")), List.of(), false);

        assertThat(r).contains("Te encontré");
        assertThat(r).contains("Caja");
    }

    private static Map<String, Object> chaqueta() {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("nombre_producto", "Chaqueta de senderismo a medida");
        f.put("descripcion_corta", "Chaqueta para montaña, cortaviento. La hacemos a tu talla y color.");
        f.put("descripcion_larga", "");
        f.put("especificaciones", "");
        f.put("como_usar", "");
        f.put("instrucciones_personalizacion", "Pasá talla de pecho/altura y el color (verde, azul o negro).");
        f.put("es_personalizado", true);
        f.put("modo_precio_personalizado", "FIJO");
        f.put("precio_venta", 12500);
        f.put("garantia_dias", 40);
        return f;
    }

    private static Map<String, Object> caja() {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("nombre_producto", "Caja");
        f.put("descripcion_corta", "");
        f.put("descripcion_larga", "");
        f.put("especificaciones", "");
        f.put("como_usar", "");
        f.put("precio_venta", 2000);
        f.put("garantia_dias", 40);
        return f;
    }
}
