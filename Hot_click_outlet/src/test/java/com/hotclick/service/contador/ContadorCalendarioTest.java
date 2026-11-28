package com.hotclick.service.contador;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Contador IA: calendario por régimen")
class ContadorCalendarioTest {

    static Map<String, String> param() {
        Map<String, String> p = new LinkedHashMap<>();
        for (String k : new String[] {ContadorParametrosService.DIA_INFORMATIVA, ContadorParametrosService.DIA_RETENCIONES,
            ContadorParametrosService.RTS_DIA_LIMITE, ContadorParametrosService.PERIODO_RENTA,
            ContadorParametrosService.PAGOS_PARCIALES, ContadorParametrosService.PAGOS_PARCIALES_PCT}) {
            p.put(k, ContadorParametrosService.defecto(k));
        }
        return p;
    }

    private static Set<String> tipos(String regimen, LocalDate hoy) {
        return ContadorCalendario.eventos(regimen, hoy, 7, param()).stream()
            .map(ContadorCalendario.Evento::tipo).collect(Collectors.toSet());
    }

    @Test
    @DisplayName("RTS: declaración trimestral, informativa y facturas; sin formulario 150 ni retenciones")
    void simplificado() {
        LocalDate hoy = LocalDate.of(2026, 12, 1);
        assertThat(tipos(ContadorCalendario.SIMPLIFICADO, hoy)).contains("RTS_TRIMESTRAL", "INFORMATIVA", "FACTURA_NEGOCIOS")
            .doesNotContain("F150", "RETENCIONES", "PAGO_PARCIAL", "RENTA");
        var rts = ContadorCalendario.proximo(ContadorCalendario.eventos(ContadorCalendario.SIMPLIFICADO, hoy, 7, param()),
            "RTS_TRIMESTRAL");
        assertThat(rts.fechaNominal()).isEqualTo(LocalDate.of(2027, 1, 15));
    }

    @Test
    @DisplayName("Tradicional: formulario 150 el 15 (corrido si cae en fin de semana), retenciones y pagos parciales")
    void tradicional() {
        LocalDate hoy = LocalDate.of(2026, 2, 20);
        var evs = ContadorCalendario.eventos(ContadorCalendario.TRADICIONAL, hoy, 7, param());
        assertThat(tipos(ContadorCalendario.TRADICIONAL, hoy)).contains("F150", "RETENCIONES", "PAGO_PARCIAL", "INFORMATIVA")
            .doesNotContain("RTS_TRIMESTRAL");
        var f150 = ContadorCalendario.proximo(evs, "F150");
        assertThat(f150.fechaNominal()).isEqualTo(LocalDate.of(2026, 3, 15));
        // El 15 de marzo de 2026 es domingo: pasa al lunes 16.
        assertThat(f150.fecha()).isEqualTo(LocalDate.of(2026, 3, 16));
        assertThat(f150.corridoPorFinDeSemana()).isTrue();
        assertThat(f150.verificar()).isTrue();
        assertThat(ContadorCalendario.proximo(evs, "PAGO_PARCIAL").fechaNominal()).isEqualTo(LocalDate.of(2026, 3, 31));
    }

    @Test
    @DisplayName("Renta: diciembre en octubre-setiembre, 15 de marzo en enero-diciembre")
    void renta() {
        var oct = ContadorCalendario.proximo(
            ContadorCalendario.eventos(ContadorCalendario.TRADICIONAL, LocalDate.of(2026, 11, 1), 7, param()), "RENTA");
        assertThat(oct.fechaNominal().getMonthValue()).isEqualTo(12);
        Map<String, String> p = param();
        p.put(ContadorParametrosService.PERIODO_RENTA, "ENE_DIC");
        var ene = ContadorCalendario.proximo(
            ContadorCalendario.eventos(ContadorCalendario.TRADICIONAL, LocalDate.of(2027, 1, 10), 7, p), "RENTA");
        assertThat(ene.fechaNominal()).isEqualTo(LocalDate.of(2027, 3, 15));
    }

    @Test
    @DisplayName("Facturas de los negocios: N días después de cada quincena")
    void facturas() {
        var evs = ContadorCalendario.eventos(ContadorCalendario.SIMPLIFICADO, LocalDate.of(2026, 11, 1), 7, param());
        assertThat(evs.stream().filter(e -> e.tipo().equals("FACTURA_NEGOCIOS")).map(ContadorCalendario.Evento::fechaNominal))
            .contains(LocalDate.of(2026, 11, 22), LocalDate.of(2026, 12, 7));
    }
}
