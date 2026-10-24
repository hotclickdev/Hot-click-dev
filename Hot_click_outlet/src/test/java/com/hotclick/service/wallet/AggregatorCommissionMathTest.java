package com.hotclick.service.wallet;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AggregatorCommissionMath — tasas plan vs ONVO")
class AggregatorCommissionMathTest {

    private static final BigDecimal OCHO = new BigDecimal("8.00");
    private static final BigDecimal CUATRO = new BigDecimal("4.00");

    @Test
    @DisplayName("Emprendedor 8% en ticket ₡20.000 — saas 800 + gw 800")
    void emprendedorOchoPct_ticketMedio() {
        var r = AggregatorCommissionMath.calcular(20_000L, OCHO, true, 400, 4);
        assertThat(r.totalComision()).isEqualTo(1_600L);
        assertThat(r.comisionGw()).isEqualTo(800L);
        assertThat(r.comisionSaas()).isEqualTo(800L);
        assertThat(r.neto()).isEqualTo(18_400L);
    }

    @Test
    @DisplayName("Emprendedor aplica mínimo ₡400 en ticket chico")
    void emprendedorMinimo_ticketChico() {
        // 8% de ₡3.000 = ₡240 → piso ₡400
        var r = AggregatorCommissionMath.calcular(3_000L, OCHO, true, 400, 4);
        assertThat(r.totalComision()).isEqualTo(400L);
        assertThat(r.comisionGw()).isEqualTo(120L); // 4% de 3000
        assertThat(r.comisionSaas()).isEqualTo(280L);
        assertThat(r.neto()).isEqualTo(2_600L);
    }

    @Test
    @DisplayName("V185: venta chica sin mínimo — 9% de ₡1.000 = ₡90")
    void ventaChicaSinMinimo() {
        var r = AggregatorCommissionMath.calcular(1_000L, new BigDecimal("9.00"), false, 0, 5);
        assertThat(r.totalComision()).isEqualTo(90L);
        assertThat(r.comisionGw()).isEqualTo(50L);
        assertThat(r.comisionSaas()).isEqualTo(40L);
        assertThat(r.neto()).isEqualTo(910L);
    }

    @Test
    @DisplayName("V185: 7,5% redondea HALF_UP a colón entero")
    void pymeSieteYMedioRedondeo() {
        // 7,5% de ₡1.010 = 75,75 → ₡76; de ₡1.003 = 75,225 → ₡75; de ₡1.006 = 75,45 → ₡75
        assertThat(AggregatorCommissionMath.calcular(1_010L, new BigDecimal("7.50"), false, 0, 5).totalComision()).isEqualTo(76L);
        assertThat(AggregatorCommissionMath.calcular(1_003L, new BigDecimal("7.50"), false, 0, 5).totalComision()).isEqualTo(75L);
        assertThat(AggregatorCommissionMath.calcular(1_006L, new BigDecimal("7.50"), false, 0, 5).totalComision()).isEqualTo(75L);
        // 7,5% de ₡10 = 0,75 → ₡1; 7,5% de ₡6 = 0,45 → ₡0
        assertThat(AggregatorCommissionMath.calcular(10L, new BigDecimal("7.50"), false, 0, 5).totalComision()).isEqualTo(1L);
        assertThat(AggregatorCommissionMath.calcular(6L, new BigDecimal("7.50"), false, 0, 5).totalComision()).isEqualTo(0L);
    }

    @Test
    @DisplayName("PYME/Plus 4% — casi todo reserva gateway, neto 96%")
    void pymeCuatroPct() {
        var r = AggregatorCommissionMath.calcular(50_000L, CUATRO, false, 400, 4);
        assertThat(r.totalComision()).isEqualTo(2_000L);
        assertThat(r.comisionGw()).isEqualTo(2_000L);
        assertThat(r.comisionSaas()).isZero();
        assertThat(r.neto()).isEqualTo(48_000L);
    }

    @Test
    @DisplayName("aplicaMinimoEmprendedor solo para EMPRENDEDOR")
    void flagMinimo() {
        assertThat(AggregatorCommissionMath.aplicaMinimoEmprendedor("EMPRENDEDOR")).isTrue();
        assertThat(AggregatorCommissionMath.aplicaMinimoEmprendedor("PYME")).isFalse();
        assertThat(AggregatorCommissionMath.aplicaMinimoEmprendedor("NEGOCIO_PLUS")).isFalse();
    }
}
