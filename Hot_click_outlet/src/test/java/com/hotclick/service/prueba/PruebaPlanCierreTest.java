package com.hotclick.service.prueba;

import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PruebaPlanCierre")
class PruebaPlanCierreTest {

    private static final LocalDate HOY = LocalDate.of(2026, 9, 23);

    @Test
    @DisplayName("la prueba vence a los 30 días")
    void venceALosTreintaDias() {
        assertThat(PruebaPlanCierre.venceEn(HOY)).isEqualTo(LocalDate.of(2026, 10, 23));
    }

    @Test
    @DisplayName("sigue abierta el día anterior al vencimiento")
    void abiertaAntes() {
        LocalDate vence = PruebaPlanCierre.venceEn(HOY);
        assertThat(PruebaPlanCierre.debeCerrar(Constants.ESTADO_PLAN_TRIAL, vence, vence.minusDays(1)))
            .isFalse();
    }

    @Test
    @DisplayName("cierra el día del vencimiento")
    void cierraElDia() {
        LocalDate vence = PruebaPlanCierre.venceEn(HOY);
        assertThat(PruebaPlanCierre.debeCerrar(Constants.ESTADO_PLAN_TRIAL, vence, vence)).isTrue();
    }

    @Test
    @DisplayName("un plan ya autorizado no se vuelve a cerrar")
    void planActivoNoCierra() {
        assertThat(PruebaPlanCierre.debeCerrar("ACTIVO", HOY, HOY.plusDays(40))).isFalse();
    }
}
