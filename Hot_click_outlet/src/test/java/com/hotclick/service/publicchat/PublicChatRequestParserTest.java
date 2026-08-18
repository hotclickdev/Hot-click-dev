package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Parser de productoId del chat público")
class PublicChatRequestParserTest {

    @Test
    @DisplayName("Solo acepta un id numérico positivo")
    void productoId_soloPositivo() {
        assertThat(PublicChatRequestParser.productoId(Map.of("productoId", 42))).isEqualTo(42L);
        assertThat(PublicChatRequestParser.productoId(Map.of("productoId", 0))).isNull();
        assertThat(PublicChatRequestParser.productoId(Map.of("productoId", -1))).isNull();
        assertThat(PublicChatRequestParser.productoId(Map.of("productoId", "42"))).isNull();
        assertThat(PublicChatRequestParser.productoId(Map.of())).isNull();
        assertThat(PublicChatRequestParser.productoId(null)).isNull();
    }
}
