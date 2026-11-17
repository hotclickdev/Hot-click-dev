package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Datos SINPE para ONVO")
class OnvoSinpeSupportTest {

    @Test
    @DisplayName("Teléfono de 8 dígitos queda en E.164 CR")
    void telefonoOchoDigitos() {
        assertThat(OnvoSinpeSupport.telefonoE164("0000-0006")).isEqualTo("+50600000006");
    }

    @Test
    @DisplayName("Teléfono que ya trae 506 se conserva")
    void telefonoCon506() {
        assertThat(OnvoSinpeSupport.telefonoE164("50600000006")).isEqualTo("+50600000006");
    }

    @Test
    @DisplayName("Cédula corta se rechaza")
    void cedulaCorta() {
        assertThatThrownBy(() -> OnvoSinpeSupport.cedula("123"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
