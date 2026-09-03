package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Intención de productos personalizados")
class PublicChatPersonalizedIntentTest {

    private final PublicChatIntentHelper helper = new PublicChatIntentHelper();

    @Test
    @DisplayName("Detecta pedido a medida / logo / cotizar")
    void detectaPersonalizado() {
        assertThat(helper.isPersonalizedIntent("quiero uno personalizado con mi logo")).isTrue();
        assertThat(helper.isPersonalizedIntent("¿me cotizás un cuadro a medida?")).isTrue();
        assertThat(helper.isPersonalizedIntent("con mi foto grabado")).isTrue();
        assertThat(helper.isPersonalizedIntent("busco un parlante bluetooth")).isFalse();
    }

    @Test
    @DisplayName("classifyIntent prioriza PERSONALIZADO")
    void classify() {
        assertThat(helper.classifyIntent("producto personalizado", false, null))
            .isEqualTo("PERSONALIZADO");
    }
}
