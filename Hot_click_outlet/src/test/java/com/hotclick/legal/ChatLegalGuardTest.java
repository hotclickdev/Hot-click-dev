package com.hotclick.legal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ChatLegalGuard")
class ChatLegalGuardTest {

    @Test
    void dejaPasarUnaConsultaNormal() {
        assertThat(ChatLegalGuard.revisar("¿Tenés audífonos en oferta?")).isEqualTo(ChatLegalGuard.Motivo.OK);
    }

    @Test
    void bloqueaUnNumeroDeTarjeta() {
        assertThat(ChatLegalGuard.revisar("paga con 4111111111111111")).isEqualTo(ChatLegalGuard.Motivo.TARJETA);
        assertThat(ChatLegalGuard.revisar("4111-1111-1111-1111")).isEqualTo(ChatLegalGuard.Motivo.TARJETA);
    }

    @Test
    void bloqueaSiDiceSerMenor() {
        assertThat(ChatLegalGuard.revisar("tengo 12 años y quiero comprar")).isEqualTo(ChatLegalGuard.Motivo.MENOR);
        assertThat(ChatLegalGuard.revisar("soy menor de edad")).isEqualTo(ChatLegalGuard.Motivo.MENOR);
        assertThat(ChatLegalGuard.revisar("tengo 19 años")).isEqualTo(ChatLegalGuard.Motivo.OK);
    }
}
