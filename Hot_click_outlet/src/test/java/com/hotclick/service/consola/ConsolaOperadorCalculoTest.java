package com.hotclick.service.consola;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConsolaOperadorCalculoTest {

    @Test
    void comisionVaSobreProductosYElEnvioSeSumaEntero() {
        QuincenaCalculo.Linea linea = QuincenaCalculo.dePedido(
            22_000, 2_000, new BigDecimal("8"), true, 400, 4,
            false, null, true, false);

        assertThat(linea.productos()).isEqualTo(20_000);
        assertThat(linea.comision()).isEqualTo(1_600);
        assertThat(linea.envio()).isEqualTo(2_000);
        assertThat(linea.neto()).isEqualTo(20_400);
        assertThat(linea.saleDelBanco()).isTrue();
    }

    @Test
    void elMinimoDeCuatrocientosCubreUnTicketChico() {
        QuincenaCalculo.Linea linea = QuincenaCalculo.dePedido(
            1_000, 0, new BigDecimal("8"), true, 400, 4,
            false, null, true, false);

        assertThat(linea.comision()).isEqualTo(400);
        assertThat(linea.neto()).isEqualTo(600);
    }

    @Test
    void elEfectivoQueNoCuadraNoSaleDelBanco() {
        QuincenaCalculo.Linea linea = QuincenaCalculo.dePedido(
            22_000, 2_000, new BigDecimal("8"), true, 400, 4,
            true, 1_000L, true, false);

        assertThat(linea.marcado()).isTrue();
        assertThat(linea.saleDelBanco()).isFalse();
    }

    @Test
    void unaCuentaNuevaNoEntraEnLaQuincenaEnQueSeRegistro() {
        LocalDate hoy = LocalDate.of(2026, 10, 6);
        assertThat(QuincenaCalculo.registradaEnQuincena(LocalDateTime.of(2026, 10, 2, 9, 0), hoy)).isTrue();
        assertThat(QuincenaCalculo.registradaEnQuincena(LocalDateTime.of(2026, 9, 20, 9, 0), hoy)).isFalse();
        assertThat(QuincenaCalculo.dePedido(
            22_000, 2_000, new BigDecimal("8"), true, 400, 4,
            false, null, true, true).saleDelBanco()).isFalse();
    }

    @Test
    void sancionSinMotivoNoSeGuarda() {
        assertThatThrownBy(() -> SancionReglas.exigirMotivo("  "))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("El motivo es obligatorio.");
    }

    @Test
    void laSegundaFaltaLeveSubeYLaTerceraCierra() {
        assertThat(SancionReglas.nivelAplicado("LEVE", 0)).isEqualTo("LEVE");
        assertThat(SancionReglas.nivelAplicado("LEVE", 1)).isEqualTo("MEDIANA");
        assertThat(SancionReglas.nivelAplicado("LEVE", 2)).isEqualTo("DEFINITIVA");
        assertThat(SancionReglas.fin("LEVE", LocalDateTime.of(2026, 10, 1, 0, 0)))
            .isEqualTo(LocalDateTime.of(2026, 10, 8, 0, 0));
        assertThat(SancionReglas.fin("DEFINITIVA", LocalDateTime.of(2026, 10, 1, 0, 0))).isNull();
    }
}
