package com.hotclick.service.sinpe;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SinpeManualDeshabilitadoTest {

    @Test
    void sinpeManualRechazadoPorDefecto() {
        assertThatThrownBy(() -> SinpeCheckoutService.exigirProveedorPermitido("SINPE", false))
            .isInstanceOf(IllegalStateException.class).hasMessage(SinpeCheckoutService.MSG_SINPE_MANUAL);
        assertThatThrownBy(() -> SinpeCheckoutService.exigirProveedorPermitido(null, false))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void efectivoSigueDisponible() {
        assertThatCode(() -> SinpeCheckoutService.exigirProveedorPermitido("EFECTIVO", false)).doesNotThrowAnyException();
    }

    @Test
    void conBanderaLegacySePermite() {
        assertThatCode(() -> SinpeCheckoutService.exigirProveedorPermitido("SINPE", true)).doesNotThrowAnyException();
    }
}
