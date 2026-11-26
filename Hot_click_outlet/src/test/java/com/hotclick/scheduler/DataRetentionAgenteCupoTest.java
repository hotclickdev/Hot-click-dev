package com.hotclick.scheduler;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** AG-29: conversaciones contadas 3 meses, uso mensual 24 meses; la lista de bajas nunca se purga. */
class DataRetentionAgenteCupoTest {

    @Test
    @DisplayName("limpiarDatosViejos purga conv_mes a 3 meses y uso_mes a 24 meses, y nunca toca las bajas")
    void cupoEntraEnLaRetencion() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DataRetentionScheduler s = new DataRetentionScheduler(jdbc, null, null);

        s.limpiarDatosViejos();

        LocalDate mesActual = LocalDate.now(com.hotclick.utils.Constants.ZONA_CR).withDayOfMonth(1);
        ArgumentCaptor<LocalDate> conv = ArgumentCaptor.forClass(LocalDate.class);
        verify(jdbc).update(contains("DELETE FROM hot_click_agente_conv_mes_tb"), conv.capture());
        assertThat(conv.getValue()).isEqualTo(mesActual.minusMonths(3));
        ArgumentCaptor<LocalDate> uso = ArgumentCaptor.forClass(LocalDate.class);
        verify(jdbc).update(contains("DELETE FROM hot_click_agente_uso_mes_tb"), uso.capture());
        assertThat(uso.getValue()).isEqualTo(mesActual.minusMonths(24));
        boolean tocaBajas = org.mockito.Mockito.mockingDetails(jdbc).getInvocations().stream()
            .anyMatch(i -> i.getArguments().length > 0 && String.valueOf(i.getArguments()[0]).contains("hot_click_agente_baja_tb"));
        assertThat(tocaBajas).isFalse();
    }
}
