package com.hotclick.service.contador;

import com.hotclick.service.contador.ComprasFiscalesProvider.ResumenCompras;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Contador IA: cálculos de IVA, RTS, renta y calculadora")
class ContadorCalculosTest {

    @Test
    @DisplayName("Formulario 150: débito menos crédito; saldo a favor si el crédito supera")
    void iva150() {
        var r = ContadorCalculos.iva150(1_000_000, 130_000, new ResumenCompras(500_000, 200_000, 65_000, true));
        assertThat(r.ivaAPagar()).isEqualTo(65_000);
        assertThat(r.saldoAFavor()).isZero();
        assertThat(r.comprasBase()).isEqualTo(700_000);
        var favor = ContadorCalculos.iva150(100_000, 13_000, new ResumenCompras(500_000, 0, 65_000, true));
        assertThat(favor.ivaAPagar()).isZero();
        assertThat(favor.saldoAFavor()).isEqualTo(52_000);
    }

    @Test
    @DisplayName("Tope anual del RTS: 186 salarios base de ₡462.200 = ₡85.969.200")
    void topeRts() {
        assertThat(ContadorCalculos.topeAnualRts(462_200)).isEqualTo(85_969_200L);
        var p = ContadorCalculos.progreso(42_984_600, 85_969_200);
        assertThat(p.pct()).isEqualByComparingTo("50.0");
        assertThat(p.superado()).isFalse();
        assertThat(ContadorCalculos.progreso(90_000_000, 85_969_200).superado()).isTrue();
    }

    @Test
    @DisplayName("Cuota trimestral del RTS: compras por factor de IVA y de renta por separado")
    void cuotaRts() {
        var q = ContadorCalculos.cuotaRts(3_000_000, new BigDecimal("0.02"), new BigDecimal("0.0125"));
        assertThat(q.iva()).isEqualTo(60_000);
        assertThat(q.renta()).isEqualTo(37_500);
        assertThat(q.total()).isEqualTo(97_500);
    }

    @Test
    @DisplayName("Sin factor configurado no se calcula nada")
    void cuotaSinFactor() {
        assertThat(ContadorCalculos.cuotaRts(3_000_000, null, new BigDecimal("0.01"))).isNull();
        assertThat(ContadorCalculos.cuotaRts(3_000_000, new BigDecimal("0.01"), null)).isNull();
    }

    @Test
    @DisplayName("Renta 2026 persona jurídica por tramos (Decreto 45333-H)")
    void rentaJuridica() {
        var tramos = ContadorParametrosService.parseTramos(
            ContadorParametrosService.defecto(ContadorParametrosService.RENTA_TRAMOS_JURIDICA));
        // 5 % de 5.621.000 = 281.050
        assertThat(ContadorCalculos.rentaPorTramos(5_621_000, tramos)).isEqualTo(281_050L);
        // + 10 % de 2.812.000 = 281.200 -> 562.250
        assertThat(ContadorCalculos.rentaPorTramos(8_433_000, tramos)).isEqualTo(562_250L);
        // + 15 % de 2.810.000 = 421.500 -> 983.750; + 20 % de 1.000.000 -> 1.183.750
        assertThat(ContadorCalculos.rentaPorTramos(12_243_000, tramos)).isEqualTo(1_183_750L);
        assertThat(ContadorCalculos.rentaPorTramos(0, tramos)).isZero();
    }

    @Test
    @DisplayName("Renta 2026 persona física: exento hasta ₡6.244.000")
    void rentaFisica() {
        var tramos = ContadorParametrosService.parseTramos(
            ContadorParametrosService.defecto(ContadorParametrosService.RENTA_TRAMOS_FISICA));
        assertThat(ContadorCalculos.rentaPorTramos(6_244_000, tramos)).isZero();
        // 10 % de (8.329.000 - 6.244.000) = 208.500
        assertThat(ContadorCalculos.rentaPorTramos(8_329_000, tramos)).isEqualTo(208_500L);
    }

    @Test
    @DisplayName("Calculadora: no inscrito paga todo el IVA y el piso es 13/113")
    void calculadoraNoInscrito() {
        var c = ContadorCalculos.calculadora(11_300, ContadorCalculos.Vendedor.NO_INSCRITO, null, new BigDecimal("14"));
        assertThat(c.ivaSinCredito()).isEqualTo(1_300);
        assertThat(c.ivaEfectivo()).isEqualTo(1_300);
        assertThat(c.daCredito()).isFalse();
        assertThat(c.recargoRecomendadoPct()).isBetween(new BigDecimal("11.50"), new BigDecimal("11.51"));
        assertThat(c.recargoCubre()).isTrue();
        assertThat(ContadorCalculos.PISO_RECARGO_SIN_CREDITO_PCT).isBetween(new BigDecimal("11.50"), new BigDecimal("11.51"));
    }

    @Test
    @DisplayName("Calculadora: con inscrito solo se paga el IVA del margen; RTS no da crédito")
    void calculadoraInscritoYRts() {
        var c = ContadorCalculos.calculadora(11_300, ContadorCalculos.Vendedor.INSCRITO, new BigDecimal("20"), new BigDecimal("14"));
        assertThat(c.daCredito()).isTrue();
        assertThat(c.ivaConCredito()).isEqualTo(260);
        assertThat(c.ivaEfectivo()).isEqualTo(260);
        var rts = ContadorCalculos.calculadora(11_300, ContadorCalculos.Vendedor.RTS, new BigDecimal("20"), new BigDecimal("10"));
        assertThat(rts.daCredito()).isFalse();
        assertThat(rts.ivaEfectivo()).isEqualTo(1_300);
        assertThat(rts.recargoCubre()).isFalse();
    }

    @Test
    @DisplayName("Calculadora rechaza precio o vendedor inválido")
    void calculadoraEntradas() {
        assertThatThrownBy(() -> ContadorCalculos.calculadora(0, ContadorCalculos.Vendedor.RTS, null, null))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(ContadorCalculos.vendedorDe("no_inscrito")).isEqualTo(ContadorCalculos.Vendedor.NO_INSCRITO);
        assertThat(ContadorCalculos.vendedorDe("otro")).isNull();
    }
}
