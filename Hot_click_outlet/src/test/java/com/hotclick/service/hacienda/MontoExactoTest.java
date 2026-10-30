package com.hotclick.service.hacienda;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("L7 (#406) | MontoExacto: bajar long → int sin pérdida")
class MontoExactoTest {

    @Test
    void valoresEnRangoPasanIgual() {
        assertThat(MontoExacto.aInt(0)).isZero();
        assertThat(MontoExacto.aInt(1950)).isEqualTo(1950);
        assertThat(MontoExacto.aInt(Integer.MAX_VALUE)).isEqualTo(Integer.MAX_VALUE);
        assertThat(MontoExacto.aInt(Integer.MIN_VALUE)).isEqualTo(Integer.MIN_VALUE);
    }

    @Test
    void fueraDeRangoFallaEnVezDeTruncar() {
        // (int) 4_294_967_296L == 0 y (int) 2_147_483_648L == MIN_VALUE: el cast daba montos falsos en silencio.
        assertThatThrownBy(() -> MontoExacto.aInt(4_294_967_296L)).isInstanceOf(IllegalStateException.class).hasMessage("Monto fuera de rango");
        assertThatThrownBy(() -> MontoExacto.aInt(Integer.MAX_VALUE + 1L)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> MontoExacto.aInt(Integer.MIN_VALUE - 1L)).isInstanceOf(IllegalStateException.class);
    }
}
