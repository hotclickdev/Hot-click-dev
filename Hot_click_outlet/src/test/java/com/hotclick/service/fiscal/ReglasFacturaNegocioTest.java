package com.hotclick.service.fiscal;

import com.hotclick.service.fiscal.ConfiguracionFiscalService.ReglasFactura;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Fase 2: reglas de la factura del negocio en la configuración fiscal")
class ReglasFacturaNegocioTest {

    @Test
    @DisplayName("Por defecto: mensaje receptor apagado, tolerancia de 1 colón y base NETO")
    void defaults() {
        assertThat(ConfiguracionFiscalService.FACTURA_DEFAULTS).isEqualTo(new ReglasFactura(false, 1, "NETO"));
    }

    @Test
    @DisplayName("Valida base (NETO|BRUTO) y tolerancia (0..1000); normaliza la base")
    void validacion() {
        assertThat(ConfiguracionFiscalService.validarFactura(new ReglasFactura(true, 5, " bruto ")).base()).isEqualTo("BRUTO");
        assertThatThrownBy(() -> ConfiguracionFiscalService.validarFactura(new ReglasFactura(false, 1, "OTRA")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ConfiguracionFiscalService.validarFactura(new ReglasFactura(false, -1, "NETO")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ConfiguracionFiscalService.validarFactura(new ReglasFactura(false, 1001, "NETO")))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Si la base no responde, queda el interruptor apagado (fail-closed)")
    @SuppressWarnings("unchecked")
    void failClosed() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(), any(RowMapper.class))).thenThrow(new DataAccessResourceFailureException("x"));
        assertThat(new ConfiguracionFiscalService(jdbc).reglasFactura().mensajeReceptorHabilitado()).isFalse();
    }
}
