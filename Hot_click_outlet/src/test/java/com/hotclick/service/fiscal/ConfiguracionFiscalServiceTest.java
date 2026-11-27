package com.hotclick.service.fiscal;

import com.hotclick.service.fiscal.ConfiguracionFiscalService.Reglas;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Base fiscal: validación de las reglas de plataforma")
class ConfiguracionFiscalServiceTest {

    private static Reglas reglas(String reg, String extra, int dias, int min, int costo) {
        return new Reglas(reg, new BigDecimal(extra), dias, min, costo);
    }

    private static void rechaza(Reglas r) {
        assertThatThrownBy(() -> ConfiguracionFiscalService.validar(r)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void defaultsSonLosDecididos() {
        Reglas d = ConfiguracionFiscalService.DEFAULTS;
        assertThat(d.regimen()).isEqualTo("SIMPLIFICADO");
        assertThat(d.extraNoInscritoPct()).isEqualByComparingTo("14.00");
        assertThat(d.diasEnviarFactura()).isEqualTo(7);
        assertThat(d.onvoPagoMinimoCrc()).isEqualTo(20_000);
        assertThat(d.onvoCostoPagoCrc()).isZero();
    }

    @Test
    void valoresValidosSeNormalizan() {
        Reglas r = ConfiguracionFiscalService.validar(reglas("tradicional", "12.5", 10, 25000, 500));
        assertThat(r.regimen()).isEqualTo("TRADICIONAL");
        assertThat(r.extraNoInscritoPct().scale()).isEqualTo(2);
    }

    @Test
    void rechazaFueraDeRango() {
        rechaza(reglas("OTRO", "14", 7, 0, 0));
        rechaza(reglas("SIMPLIFICADO", "-1", 7, 0, 0));
        rechaza(reglas("SIMPLIFICADO", "50.01", 7, 0, 0));
        rechaza(reglas("SIMPLIFICADO", "14.123", 7, 0, 0));
        rechaza(reglas("SIMPLIFICADO", "14", 0, 0, 0));
        rechaza(reglas("SIMPLIFICADO", "14", 61, 0, 0));
        rechaza(reglas("SIMPLIFICADO", "14", 7, -1, 0));
        rechaza(reglas("SIMPLIFICADO", "14", 7, 0, 100_001));
    }

    @Test
    void fecSoloActivaConTradicionalYInterruptor() {
        var on = new ConfiguracionFiscalService.Fec(true, false);
        var off = ConfiguracionFiscalService.FEC_APAGADA;
        assertThat(ConfiguracionFiscalService.activa("TRADICIONAL", on)).isTrue();
        assertThat(ConfiguracionFiscalService.activa("SIMPLIFICADO", on)).isFalse();
        assertThat(ConfiguracionFiscalService.activa("TRADICIONAL", off)).isFalse();
    }
}
