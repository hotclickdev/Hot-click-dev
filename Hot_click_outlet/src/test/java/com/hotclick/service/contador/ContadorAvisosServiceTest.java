package com.hotclick.service.contador;

import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("Contador IA: avisos al ADMIN 3 días antes de cada vencimiento")
class ContadorAvisosServiceTest {

    @Test
    @DisplayName("Solo crea avisos para lo que vence en 3 días o menos, en un solo lote")
    @SuppressWarnings("unchecked")
    void tresDiasAntes() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.batchUpdate(anyString(), anyList())).thenAnswer(i -> new int[((List<Object[]>) i.getArgument(1)).size()]);
        ConfiguracionFiscalService config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        ContadorParametrosService parametros = mock(ContadorParametrosService.class);
        when(parametros.todos()).thenReturn(ContadorCalendarioTest.param());
        var svc = new ContadorAvisosService(jdbc, config, parametros);

        // RTS: el 13 de enero de 2027 faltan 2 días para la declaración trimestral del 15.
        svc.generar(LocalDate.of(2027, 1, 13));
        ArgumentCaptor<List<Object[]>> filas = ArgumentCaptor.forClass(List.class);
        verify(jdbc).batchUpdate(contains("ON CONFLICT (clave) DO NOTHING"), filas.capture());
        assertThat(filas.getValue()).isNotEmpty().allSatisfy(f -> {
            LocalDate vence = (LocalDate) f[4];
            assertThat(vence).isBetween(LocalDate.of(2027, 1, 13), LocalDate.of(2027, 1, 16));
        });
        assertThat(filas.getValue()).anySatisfy(f -> assertThat(f[1]).isEqualTo("RTS_TRIMESTRAL"));
    }

    @Test
    @DisplayName("Sin vencimientos cercanos no toca la base")
    void nadaCerca() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ConfiguracionFiscalService config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        ContadorParametrosService parametros = mock(ContadorParametrosService.class);
        when(parametros.todos()).thenReturn(ContadorCalendarioTest.param());
        // 1 de enero de 2027: lo próximo es el 7 (facturas) y el 15; nada a 3 días.
        assertThat(new ContadorAvisosService(jdbc, config, parametros).generar(LocalDate.of(2027, 1, 1))).isZero();
        verifyNoInteractions(jdbc);
    }
}
