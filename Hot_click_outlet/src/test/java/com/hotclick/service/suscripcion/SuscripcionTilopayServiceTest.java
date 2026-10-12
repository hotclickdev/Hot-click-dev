package com.hotclick.service.suscripcion;

import com.hotclick.model.CobroSuscripcion;
import com.hotclick.service.TilopayService.ConsultaResultado;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class SuscripcionTilopayServiceTest {

    private static CobroSuscripcion cobro() {
        CobroSuscripcion c = new CobroSuscripcion();
        c.setOrderNumber("SUB-5-ABC");
        c.setMontoCrc(12_900L); // Pyme
        return c;
    }

    private static ConsultaResultado consulta(String monto, String moneda, String orden, boolean simulada) {
        return new ConsultaResultado(true, "1", "ok", "AUTH", monto == null ? null : new BigDecimal(monto),
            moneda, orden, simulada);
    }

    @Test
    void aceptaSoloMontoMonedaYOrdenExactos() {
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("12900", "CRC", "SUB-5-ABC", false), false)).isTrue();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("100", "CRC", "SUB-5-ABC", false), false)).isFalse();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("12900", "USD", "SUB-5-ABC", false), false)).isFalse();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("12900", "CRC", "SUB-9-XYZ", false), false)).isFalse();
    }

    @Test
    void simulacionSoloEnModoPrueba() {
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta(null, null, null, true), true)).isTrue();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta(null, null, null, true), false)).isFalse();
    }

    @Test
    void proximoCobroCaeEnElDiaDelNegocio() {
        assertThat(SuscripcionTilopayService.proximoCobro(LocalDate.of(2026, 10, 12), 28)).isEqualTo(LocalDate.of(2026, 11, 28));
        assertThat(SuscripcionTilopayService.proximoCobro(LocalDate.of(2026, 10, 12), 13)).isEqualTo(LocalDate.of(2026, 11, 13));
        assertThat(SuscripcionTilopayService.proximoCobro(LocalDate.of(2027, 1, 30), 28)).isEqualTo(LocalDate.of(2027, 2, 28));
    }
}
