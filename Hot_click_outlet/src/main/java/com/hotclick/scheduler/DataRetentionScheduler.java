package com.hotclick.scheduler;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Limpieza periódica de tablas de alto volumen para prevenir degradación
 * progresiva de performance en producción.
 *
 * Política de retención:
 *   - hot_click_auditoria_admin_tb (seguridad):  90 días
 *   - hot_click_carrito_abandonado_tb:           30 días (estado EXPIRADO o EMAIL_ENVIADO)
 *   - hot_click_ai_mensaje_tb:                   30 días (historial chat copilot)
 *   - hot_click_webhook_event_tb:                90 días (solo procesado=true)
 *   - hot_click_rate_limit_tb:                   on-expiry (expires_at < epoch now)
 *   - shedlock (locks viejos):                   7 días
 *   - hot_click_chat_sesion_tb:                  30 días (inactividad por ultimo_mensaje_en)
 *     └─ hot_click_chat_mensaje_shopping_tb:     cascada automática vía ON DELETE CASCADE
 *
 * Corre a las 2:30 AM con ShedLock — solo un pod lo ejecuta en multi-pod.
 * Borra en lotes pequeños (LIMIT 500) para no generar un lock masivo en la tabla.
 */
@Component
public class DataRetentionScheduler {

    private static final Logger log = LoggerFactory.getLogger(DataRetentionScheduler.class);

    private final JdbcTemplate jdbc;

    public DataRetentionScheduler(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Scheduled(cron = "0 30 2 * * *")
    @SchedulerLock(name = "data_retention", lockAtMostFor = "PT1H", lockAtLeastFor = "PT15M")
    public void limpiarDatosViejos() {
        long inicio = System.currentTimeMillis();
        int total = 0;

        total += limpiarAuditoriaSeguridad();
        total += limpiarCarritosExpirados();
        total += limpiarMensajesAi();
        total += limpiarWebhookEvents();
        total += limpiarRateLimitExpirados();
        total += limpiarShedlockViejos();
        total += limpiarSesionesChatAsistente();

        long ms = System.currentTimeMillis() - inicio;
        if (total > 0) {
            log.info("[retention] {} registro(s) eliminado(s) en {}ms", total, ms);
        }
    }

    private int limpiarAuditoriaSeguridad() {
        LocalDateTime corte = LocalDateTime.now().minusDays(90);
        // PostgreSQL no soporta LIMIT en DELETE — usar subconsulta con ctid para batching
        int n = jdbc.update(
            "DELETE FROM hot_click_auditoria_admin_tb " +
            "WHERE ctid IN (SELECT ctid FROM hot_click_auditoria_admin_tb WHERE fecha < ? LIMIT 500)",
            corte
        );
        if (n > 0) log.info("[retention] auditoria_admin: {} registros eliminados (> 90 días)", n);
        return n;
    }

    private int limpiarCarritosExpirados() {
        LocalDateTime corte = LocalDateTime.now().minusDays(30);
        int n = jdbc.update(
            "DELETE FROM hot_click_carrito_abandonado_tb " +
            "WHERE ctid IN (" +
            "  SELECT ctid FROM hot_click_carrito_abandonado_tb " +
            "  WHERE status IN ('VENCIDO', 'EMAIL_ENVIADO') AND created_at < ? LIMIT 500" +
            ")",
            corte
        );
        if (n > 0) log.info("[retention] carrito_abandonado: {} registros eliminados (> 30 días)", n);
        return n;
    }

    private int limpiarMensajesAi() {
        LocalDateTime corte = LocalDateTime.now().minusDays(30);
        int total = 0, n;
        // do/while: vacía el backlog completo aunque supere 500 filas acumuladas
        do {
            n = jdbc.update(
                "DELETE FROM hot_click_ai_mensaje_tb WHERE ctid IN " +
                "(SELECT ctid FROM hot_click_ai_mensaje_tb WHERE fecha_creacion < ? LIMIT 500)",
                corte);
            total += n;
        } while (n == 500);
        if (total > 0) log.info("[retention] ai_mensaje: {} eliminados (> 30 días)", total);
        return total;
    }

    private int limpiarWebhookEvents() {
        LocalDateTime corte = LocalDateTime.now().minusDays(90);
        int n = jdbc.update(
            "DELETE FROM hot_click_webhook_event_tb WHERE ctid IN (" +
            "  SELECT ctid FROM hot_click_webhook_event_tb " +
            "  WHERE procesado = true AND created_at < ? LIMIT 500" +
            ")",
            corte);
        if (n > 0) log.info("[retention] webhook_events: {} eliminados (> 90 días, procesados)", n);
        return n;
    }

    private int limpiarRateLimitExpirados() {
        long now = Instant.now().getEpochSecond();
        int n = jdbc.update("DELETE FROM hot_click_rate_limit_tb WHERE expires_at < ?", now);
        if (n > 0) log.info("[retention] rate_limit: {} buckets expirados eliminados", n);
        return n;
    }

    private int limpiarShedlockViejos() {
        LocalDateTime corte = LocalDateTime.now().minusDays(7);
        int n = jdbc.update("DELETE FROM shedlock WHERE lock_until < ?", corte);
        return n;
    }

    private int limpiarSesionesChatAsistente() {
        LocalDateTime corte = LocalDateTime.now().minusDays(30);
        // Los mensajes en hot_click_chat_mensaje_shopping_tb se eliminan automáticamente
        // por ON DELETE CASCADE definido en V63. Solo es necesario borrar la sesión padre.
        // do/while vacía el backlog completo si se acumularon más de 500 sesiones.
        int total = 0, n;
        do {
            n = jdbc.update(
                "DELETE FROM hot_click_chat_sesion_tb WHERE ctid IN " +
                "(SELECT ctid FROM hot_click_chat_sesion_tb WHERE ultimo_mensaje_en < ? LIMIT 500)",
                corte);
            total += n;
        } while (n == 500);
        if (total > 0) log.info("[retention] chat_sesion: {} sesiones eliminadas (> 30 días, mensajes en cascada)", total);
        return total;
    }
}
