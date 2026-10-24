package com.hotclick.scheduler;

import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.model.WaMensajeLog;
import com.hotclick.repository.WaMensajeLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

@DisplayName("WaMensajeLog: retención provisional de 30 días configurable")
class WaMensajeLogRetencionSchedulerTest extends BaseIntegrationTest {

    @Autowired private WaMensajeLogRetencionScheduler scheduler;
    @Autowired private WaMensajeLogRepository repo;

    private WaMensajeLog log(String tel, LocalDateTime fecha) {
        WaMensajeLog w = new WaMensajeLog();
        w.setTelefono(tel);
        w.setTipoMensaje("PRUEBA_RETENCION");
        w.setTextoEnviado("hola");
        w.setEstado("ENVIADO");
        w.setFechaEnvio(fecha);
        return repo.save(w);
    }

    @Test @DisplayName("Borra lo de más de 30 días y deja lo reciente")
    void purgaSoloLoViejo() {
        LocalDateTime ahora = LocalDateTime.of(2026, 10, 22, 3, 15);
        WaMensajeLog viejo = log("tel-prueba-1", ahora.minusDays(31));
        WaMensajeLog justo = log("tel-prueba-2", ahora.minusDays(29));
        WaMensajeLog nuevo = log("tel-prueba-3", ahora.minusHours(1));

        int borrados = scheduler.purgar(ahora);

        assertThat(borrados).isGreaterThanOrEqualTo(1);
        assertThat(repo.findById(viejo.getId())).isEmpty();
        assertThat(repo.findById(justo.getId())).isPresent();
        assertThat(repo.findById(nuevo.getId())).isPresent();
    }

    @Test @DisplayName("El plazo sale de la propiedad y rechaza valores menores a 1")
    void propiedad() {
        assertThat(scheduler.getRetencionDias()).isEqualTo(30);
        var s7 = new WaMensajeLogRetencionScheduler(mock(JdbcTemplate.class), 7);
        assertThat(s7.getRetencionDias()).isEqualTo(7);
        assertThatThrownBy(() -> new WaMensajeLogRetencionScheduler(mock(JdbcTemplate.class), 0))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
