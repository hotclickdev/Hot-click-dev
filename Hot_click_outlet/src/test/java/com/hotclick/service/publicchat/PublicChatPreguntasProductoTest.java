package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Chat: responde garantía, medidas y envío (QA r3)")
class PublicChatPreguntasProductoTest {

    private final PublicChatIntentHelper intent = new PublicChatIntentHelper();
    private final PublicChatAdvisorAnswers answers = new PublicChatAdvisorAnswers(intent);
    private final PublicChatMockResponses mock = new PublicChatMockResponses(answers);

    private static Map<String, Object> sofa() {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("id_producto", 4);
        f.put("nombre_producto", "QA-TEST Sofá 3 plazas gris");
        f.put("descripcion_corta", "Producto ficticio de prueba QA3. Garantía 6 meses.");
        f.put("descripcion_larga", "");
        f.put("especificaciones", "Medidas: 210x90 cm. Garantía 6 meses.");
        f.put("como_usar", "");
        f.put("precio_venta", 10000);
        return f;
    }

    @Test
    @DisplayName("Garantía y medidas en la misma pregunta: responde ambas desde la ficha")
    void garantiaYMedidas_ambas() {
        String r = answers.responder(sofa(), "¿Qué garantía tiene el sofá y cuáles son sus medidas?", false);
        assertThat(r).contains("Garantía 6 meses").contains("210x90");
    }

    @Test
    @DisplayName("Garantía sin garantia_dias: usa el texto de la ficha")
    void garantia_desdeTexto() {
        assertThat(answers.responder(sofa(), "¿Tiene garantía?", false)).contains("Garantía 6 meses");
    }

    @Test
    @DisplayName("Sin modelo: una pregunta de garantía sobre un producto encontrado responde el dato, no solo lo ofrece")
    void mock_preguntaDeFicha_respondeDato() {
        String r = mock.generarRespuestaMock(List.of(sofa()), List.of(), "¿Qué garantía tiene el sofá?", false);
        assertThat(r).contains("Garantía 6 meses").doesNotContain("Te encontré");
    }

    @Test
    @DisplayName("Sin modelo: una búsqueda normal sigue ofreciendo productos")
    void mock_busqueda_sigueIgual() {
        String r = mock.generarRespuestaMock(List.of(sofa()), List.of(), "busco un sofá", false);
        assertThat(r).contains("Te encontré");
    }

    @Test
    @DisplayName("Envío: se detecta como pregunta de logística, no como búsqueda")
    void envio_detectado() {
        assertThat(intent.isShippingQuery("¿Hacen envíos a Cartago y cuánto cuesta?")).isTrue();
        assertThat(intent.isShippingQuery("¿Cuánto tarda el envío?")).isTrue();
        assertThat(intent.isShippingQuery("How does shipping work?")).isTrue();
        assertThat(intent.isShippingQuery("Busco algo cómodo para la sala")).isFalse();
    }
}
