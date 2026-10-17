package com.hotclick.service.suscripcion;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** La activación de plan pasa por un puerto neutral (Tilopay hoy, ONVO después). */
class PlanPagoConfirmadoPortTest {
    @Test
    void tilopayDependeDelPuertoNoDeOnvo() throws Exception {
        var tipos = SuscripcionTilopayService.class.getConstructors()[0].getParameterTypes();
        assertThat(tipos).contains(PlanPagoConfirmado.class).doesNotContain(SuscripcionOnvoChangeService.class);
        assertThat(PlanPagoConfirmado.class.isAssignableFrom(SuscripcionOnvoChangeService.class)).isTrue();
    }
}
