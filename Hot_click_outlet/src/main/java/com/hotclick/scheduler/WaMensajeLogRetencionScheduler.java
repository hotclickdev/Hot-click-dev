package com.hotclick.scheduler;

import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Purga de hot_click_wa_log_tb (WaMensajeLog): borra los mensajes con fecha_envio más vieja que
 * {@code hotclick.wa.mensaje-log.retencion-dias} (30 por defecto).
 *
 * PROVISIONAL: el plazo de 30 días está PENDIENTE DE CONFIRMACIÓN LEGAL (leg-costa-rica, Ley 8968).
 * Cambialo solo por propiedad, no en código.
 * El límite por hora de mensajes CRM (WhatsAppService) mira la última hora, así que 30 días no lo afecta.
 * Corre a las 3:15 AM (hora CR) con ShedLock, en lotes de 500 filas.
 */
@Component
public class WaMensajeLogRetencionScheduler {

    private static final Logger log = LoggerFactory.getLogger(WaMensajeLogRetencionScheduler.class);
    static final int LOTE = 500;
    private static final int MAX_LOTES = 200;

    private final JdbcTemplate jdbc;
    private final int retencionDias;

    public WaMensajeLogRetencionScheduler(JdbcTemplate jdbc,
            // PROVISIONAL, pendiente de confirmación legal (leg-costa-rica).
            @Value("${hotclick.wa.mensaje-log.retencion-dias:30}") int retencionDias) {
        if (retencionDias < 1) throw new IllegalArgumentException("hotclick.wa.mensaje-log.retencion-dias debe ser >= 1");
        this.jdbc = jdbc;
        this.retencionDias = retencionDias;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "America/Costa_Rica")
    @SchedulerLock(name = "wa_mensaje_log_retencion", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
    public void purgarProgramado() {
        int borrados = purgar(LocalDateTime.now(Constants.ZONA_CR));
        if (borrados > 0) log.info("[wa-log-retencion] {} mensaje(s) de más de {} días borrados", borrados, retencionDias);
    }

    /** Borra en lotes los mensajes anteriores a {@code ahora - retencionDias}. Devuelve cuántos borró. */
    public int purgar(LocalDateTime ahora) {
        LocalDateTime corte = ahora.minusDays(retencionDias);
        int total = 0;
        for (int i = 0; i < MAX_LOTES; i++) {
            int n = jdbc.update(
                "DELETE FROM hot_click_wa_log_tb WHERE id IN "
                + "(SELECT id FROM hot_click_wa_log_tb WHERE fecha_envio < ? ORDER BY id LIMIT " + LOTE + ")", corte);
            total += n;
            if (n < LOTE) break;
        }
        return total;
    }

    public int getRetencionDias() { return retencionDias; }
}
