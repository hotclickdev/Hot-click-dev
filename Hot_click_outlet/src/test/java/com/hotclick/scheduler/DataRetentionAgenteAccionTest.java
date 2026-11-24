package com.hotclick.scheduler;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** AG-21: la bitácora del modo interno y las vinculaciones revocadas se purgan a los 90 días. */
class DataRetentionAgenteAccionTest {

    @Test
    @DisplayName("limpiarDatosViejos borra hot_click_agente_accion_tb y vinculaciones revocadas con corte de 90 días")
    void bitacoraEntraEnLaRetencion() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DataRetentionScheduler s = new DataRetentionScheduler(jdbc, null, null);

        s.limpiarDatosViejos();

        org.mockito.ArgumentCaptor<LocalDateTime> args = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        verify(jdbc).update(contains("DELETE FROM hot_click_agente_accion_tb"), args.capture());
        LocalDateTime corte = args.getValue();
        assertThat(corte).isBefore(LocalDateTime.now().minusDays(89)).isAfter(LocalDateTime.now().minusDays(92));
        verify(jdbc).update(contains("hot_click_agente_vinculacion_tb"), any(LocalDateTime.class));
    }
}
