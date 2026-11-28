package com.hotclick.service.fiscal;

import com.hotclick.service.fiscal.ConfiguracionFiscalService.SwitchesOnvo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@DisplayName("Interruptores del cobro por ONVO: apagados por defecto y fail-closed")
class InterruptoresOnvoTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ConfiguracionFiscalService svc = new ConfiguracionFiscalService(jdbc);

    @Test
    @DisplayName("Sin fila o con la base caída: ambos apagados")
    void apagadosPorDefecto() {
        when(jdbc.query(anyString(), any(RowMapper.class))).thenReturn(List.of());
        assertThat(svc.switchesOnvo()).isEqualTo(new SwitchesOnvo(false, false));
        assertThat(svc.cobroANombreNegocioActivo()).isFalse();
        assertThat(svc.enlacesPagoActivos()).isFalse();
        when(jdbc.query(anyString(), any(RowMapper.class))).thenThrow(new DataAccessResourceFailureException("bd"));
        assertThat(svc.switchesOnvo()).isEqualTo(new SwitchesOnvo(false, false));
    }

    @Test
    @DisplayName("Lee lo guardado y lo actualiza (UPDATE; INSERT solo si no había fila)")
    void leeYActualiza() {
        when(jdbc.query(anyString(), any(RowMapper.class))).thenReturn(List.of(new SwitchesOnvo(true, false)));
        assertThat(svc.cobroANombreNegocioActivo()).isTrue();
        assertThat(svc.enlacesPagoActivos()).isFalse();

        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        assertThat(svc.actualizarSwitchesOnvo(true, true)).isEqualTo(new SwitchesOnvo(true, true));
        verify(jdbc, times(1)).update(anyString(), any(Object[].class));

        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(0).thenReturn(1);
        svc.actualizarSwitchesOnvo(false, false);
        verify(jdbc, times(3)).update(anyString(), any(Object[].class));
    }
}
