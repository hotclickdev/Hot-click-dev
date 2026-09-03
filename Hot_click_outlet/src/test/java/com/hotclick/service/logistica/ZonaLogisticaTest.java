package com.hotclick.service.logistica;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class ZonaLogisticaTest {

    @Test
    void gam_pasa() {
        assertThatCode(() -> ZonaLogistica.exigirGam(ZonaLogistica.GAM)).doesNotThrowAnyException();
    }

    @Test
    void fueraGam_falla() {
        assertThatThrownBy(() -> ZonaLogistica.exigirGam(ZonaLogistica.FUERA_GAM))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ZonaLogistica.MSG_SOLO_GAM);
    }
}
