package com.hotclick.service.suscripcion;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class PlanNuevoPendienteAvisoTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 16, 12, 0);

    @Test
    void planElegidoSinPagarSeAvisa() {
        assertThat(SuscripcionTilopayService.avisarPlanPendiente(AHORA.minusDays(1), AHORA, "PYME", "EMPRENDEDOR")).isTrue();
    }

    @Test
    void yaEnEsePlanOViejoNoSeAvisa() {
        assertThat(SuscripcionTilopayService.avisarPlanPendiente(AHORA.minusDays(1), AHORA, "PYME", "pyme")).isFalse();
        assertThat(SuscripcionTilopayService.avisarPlanPendiente(AHORA.minusDays(8), AHORA, "PYME", "EMPRENDEDOR")).isFalse();
        assertThat(SuscripcionTilopayService.avisarPlanPendiente(AHORA, AHORA, null, "EMPRENDEDOR")).isFalse();
    }
}
