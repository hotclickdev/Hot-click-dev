package com.hotclick.config;

import com.hotclick.service.payment.OrderPricingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Envíos 12-oct: rápido Uber Flash 8–19 con cola al día siguiente; encomienda ₡2.000")
class EnvioRapidoVentanaTest {

    private static final LocalDate DIA = LocalDate.of(2026, 10, 12);

    @Test
    void ventanaYCola() {
        assertThat(TiemposEnvio.ventanaRapidoDesde()).isEqualTo(8);
        assertThat(TiemposEnvio.ventanaRapidoHasta()).isEqualTo(19);
        assertThat(TiemposEnvio.diaSalidaRapido(DIA.atTime(10, 0))).isEqualTo(DIA);
        assertThat(TiemposEnvio.rapidoEnCola(DIA.atTime(10, 0))).isFalse();
        assertThat(TiemposEnvio.diaSalidaRapido(DIA.atTime(19, 0))).isEqualTo(DIA.plusDays(1));
        assertThat(TiemposEnvio.rapidoEnCola(DIA.atTime(19, 0))).isTrue();
        assertThat(TiemposEnvio.diaSalidaRapido(DIA.atTime(6, 30))).isEqualTo(DIA);
        assertThat(TiemposEnvio.rapidoEnCola(DIA.atTime(6, 30))).isTrue();
    }

    @Test
    void tarifas() {
        OrderPricingService s = new OrderPricingService();
        assertThat(s.calcularCostoEnvio("ENVIO_RAPIDO")).isEqualTo(5000);
        assertThat(s.calcularCostoEnvio("ENVIO_NORMAL_GAM")).isEqualTo(4000);
        assertThat(s.calcularCostoEnvio("ENCOMIENDA_PROPIA")).isEqualTo(2000);
        assertThat(s.calcularCostoEnvio("RETIRO_EN_TIENDA")).isZero();
    }
}
