package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Chat: la respuesta de envío no inventa montos")
class PublicChatServiceEnvioTest {

    @Test
    void envio_sinMontosFijos() {
        assertThat(PublicChatService.shippingText(false)).contains("Costa Rica").contains("checkout")
            .doesNotContain("₡").doesNotMatch(".*\\d.*");
        assertThat(PublicChatService.shippingText(true)).contains("checkout").doesNotMatch(".*\\d.*");
    }
}
