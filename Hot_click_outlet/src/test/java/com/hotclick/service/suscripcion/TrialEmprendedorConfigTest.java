package com.hotclick.service.suscripcion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("TrialEmprendedorConfig")
class TrialEmprendedorConfigTest {

    @Test
    @DisplayName("Valores configurados se respetan (cupo y días no están fijos)")
    void valoresConfigurados() {
        TrialEmprendedorConfig c = new TrialEmprendedorConfig(25, 45);
        assertThat(c.cupo()).isEqualTo(25);
        assertThat(c.dias()).isEqualTo(45);
    }

    @Test
    @DisplayName("Cupo 0 es válido (apaga el trial)")
    void cupoCeroValido() {
        assertThat(new TrialEmprendedorConfig(0, 90).cupo()).isZero();
    }

    @Test
    @DisplayName("Días fuera de rango o cupo negativo abortan el arranque (fail-fast)")
    void invalidosAbortan() {
        assertThatThrownBy(() -> new TrialEmprendedorConfig(70, 0)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TrialEmprendedorConfig(70, -3)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TrialEmprendedorConfig(70, 366)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TrialEmprendedorConfig(-1, 90)).isInstanceOf(IllegalStateException.class);
    }
}
