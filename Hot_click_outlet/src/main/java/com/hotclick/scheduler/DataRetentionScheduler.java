package com.hotclick.scheduler;
import com.hotclick.utils.Constants;

import com.hotclick.agente.lead.TipoLead;
import com.hotclick.repository.IpBloqueadaRepository;
import com.hotclick.service.EncargoService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
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
 *   - hot_click_cola_facturacion_offline_tb:     30 días (estado COMPLETADO o AGOTADO)
 *
 *   - hot_click_embudo_sesion_tb:                90 días (sesión anónima del embudo)
 *   - hot_click_lead_tb:                         180 días COMPRADOR, 365 días NEGOCIO (AG-27)
 *   - hot_click_agente_conv_mes_tb:              3 meses (conversaciones contadas del cupo, AG-29)
 *   - hot_click_agente_uso_mes_tb:               24 meses (conversaciones y costo de IA: facturación y métricas, AG-29)
 *   - hot_click_agente_aviso_unico_tb:           180 días (guarda de idempotencia de avisos del bot, AG-34/AG-40; sin datos personales)
 *   - hot_click_agente_baja_tb:                  NUNCA se purga (ver limpiarAgenteCupo)
 *   - hot_click_agente_alerta_meta_tb:           90 días (avisos de Meta de cuenta y calidad, AG-32)
 *   - hot_click_agente_resena_aviso_tb:          365 días (guarda de "reseña ya pedida" por pedido, AG-35)
 *   - encuesta de satisfacción (AG-38):          vive en hot_click_chat_sesion_tb: se borra con la sesión (30 días)
 *
 * Corre a las 2:30 AM con ShedLock — solo un pod lo ejecuta en multi-pod.
 * Borra en lotes pequeños (LIMIT 500) para no generar un lock masivo en la tabla.
 */
@Component
public class DataRetentionScheduler {

    private static final Logger log = LoggerFactory.getLogger(DataRetentionScheduler.class);

    private final JdbcTemplate          jdbc;
    private final IpBloqueadaRepository ipBloqueadaRepo;
    private final EncargoService        encargoService;

    public DataRetentionScheduler(JdbcTemplate jdbc, IpBloqueadaRepository ipBloqueadaRepo,
                                  EncargoService encargoService) {
        this.jdbc            = jdbc;
        this.ipBloqueadaRepo = ipBloqueadaRepo;
        this.encargoService  = encargoService;
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
        total += limpiarColaFacturacionOffline();
        total += expirarIpsBloqueadas();
        total += marcarEncargosVencidos();
        total += limpiarEncargosViejos();
        total += limpiarEmbudoSesiones();
        total += limpiarEnlacesCompra();
        total += limpiarAgenteAcciones();
        total += limpiarLeads();
        total += limpiarAgenteCupo();
        total += limpiarAgenteMetricas();
        total += limpiarAvisosUnicosAgente();

        long ms = System.currentTimeMillis() - inicio;
        if (total > 0) {
            log.info("[retention] {} registro(s) eliminado(s) en {}ms", total, ms);
        }
    }

    /** AG-21: bitácora del modo interno del bot y vinculaciones revocadas, 90 días. */
    private int limpiarAgenteAcciones() {
        try {
            LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR)
                    .minusDays(Constants.DIAS_RETENCION_AGENTE_ACCION);
            int n = jdbc.update(
                "DELETE FROM hot_click_agente_accion_tb WHERE ctid IN (" +
                "SELECT ctid FROM hot_click_agente_accion_tb WHERE fecha_creacion < ? LIMIT 500)",
                corte);
            n += jdbc.update(
                "DELETE FROM hot_click_agente_vinculacion_tb WHERE ctid IN (" +
                "SELECT ctid FROM hot_click_agente_vinculacion_tb WHERE estado = 'REVOCADA' " +
                "AND fecha_revocacion < ? LIMIT 500)",
                corte);
            if (n > 0) log.info("[retention] agente_accion/vinculacion: {} eliminados (> 90 días)", n);
            return n;
        } catch (Exception e) {
            log.warn("[retention] agente_accion: tabla no disponible, omitiendo — {}", e.getClass().getSimpleName());
            return 0;
        }
    }

    private int limpiarAuditoriaSeguridad() {
        try {
            LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR)
                    .minusDays(Constants.DIAS_RETENCION_AUDITORIA_ADMIN);
            int n = jdbc.update(
                "DELETE FROM hot_click_auditoria_admin_tb " +
                "WHERE ctid IN (SELECT ctid FROM hot_click_auditoria_admin_tb WHERE fecha < ? LIMIT 500)",
                corte
            );
            if (n > 0) log.info("[retention] auditoria_admin: {} registros eliminados (> 90 días)", n);
            return n;
        } catch (Exception e) {
            log.warn("[retention] auditoria_admin: tabla no disponible, omitiendo — {}", e.getMessage());
            return 0;
        }
    }

    private int limpiarCarritosExpirados() {
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(30);
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
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(30);
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

    /**
     * AG-07: los enlaces de compra del bot guardan el contacto del cliente (su número de WhatsApp). Se borran 90 días
     * después de que vencen (ítems en cascada); el pedido conserva la atribución en {@code origen_canal} y su FK al
     * enlace pasa a NULL (ON DELETE SET NULL). 90 días cubre soporte, reclamos de pago y la ventana de contracargos.
     */
    private int limpiarEnlacesCompra() {
        try {
            LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(90);
            int n = jdbc.update(
                "DELETE FROM hot_click_enlace_compra_tb WHERE id_enlace_compra IN (" +
                "  SELECT id_enlace_compra FROM hot_click_enlace_compra_tb WHERE vence < ? LIMIT 500)", corte);
            if (n > 0) log.info("[retention] enlace_compra: {} eliminados (vencidos hace > 90 días)", n);
            return n;
        } catch (Exception e) {
            log.warn("[retention] enlace_compra: tabla no disponible, omitiendo — {}", e.getClass().getSimpleName());
            return 0;
        }
    }

    /**
     * AG-27: leads del bot (contacto cifrado + nombre + interés, datos personales Ley 8968). Compradores 6 meses
     * (180 días), negocios 12 meses (365 días), contados desde su creación.
     */
    private int limpiarLeads() {
        try {
            int total = 0;
            LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
            for (TipoLead tipo : TipoLead.values()) {
                total += borrarLeadsViejos(tipo, ahora.minusDays(tipo.retencionDias()));
            }
            return total;
        } catch (Exception e) {
            log.warn("[retention] lead: tabla no disponible, omitiendo — {}", e.getClass().getSimpleName());
            return 0;
        }
    }

    private int borrarLeadsViejos(TipoLead tipo, LocalDateTime corte) {
        int total = 0, n;
        do {
            n = jdbc.update(
                "DELETE FROM hot_click_lead_tb WHERE id_lead IN (" +
                "SELECT id_lead FROM hot_click_lead_tb WHERE tipo = ? AND creado_en < ? LIMIT 500)",
                tipo.name(), corte);
            total += n;
        } while (n == 500);
        if (total > 0) log.info("[retention] lead {}: {} eliminados (> {} días)", tipo, total, tipo.retencionDias());
        return total;
    }

    /**
     * AG-34 / AG-40: la guarda de "un solo aviso" (comprobante, pasos de onboarding) solo hace falta mientras el
     * evento pueda repetirse o la ventana de 24 h siga abierta; 180 días la cubre con margen. Sin datos personales.
     */
    private int limpiarAvisosUnicosAgente() {
        try {
            Instant corte = Instant.now().minus(java.time.Duration.ofDays(180));
            int total = 0, n;
            do {
                n = jdbc.update(
                    "DELETE FROM hot_click_agente_aviso_unico_tb WHERE ctid IN (" +
                    "SELECT ctid FROM hot_click_agente_aviso_unico_tb WHERE creado_en < ? LIMIT 500)",
                    java.sql.Timestamp.from(corte));
                total += n;
            } while (n == 500);
            if (total > 0) log.info("[retention] agente_aviso_unico: {} eliminados (> 180 días)", total);
            return total;
        } catch (Exception e) {
            log.warn("[retention] agente_aviso_unico: tabla no disponible, omitiendo — {}", e.getClass().getSimpleName());
            return 0;
        }
    }

    /**
     * AG-29: conversaciones contadas del cupo (hash del contacto) 3 meses y uso mensual (conversaciones y costo de IA)
     * 24 meses, por la columna {@code mes} (primer día del mes). {@code hot_click_agente_baja_tb} NO se purga nunca:
     * solo guarda el hash del contacto, el canal y la fecha, y la baja (STOP) debe respetarse siempre; borrarla
     * volvería a enviar recordatorios a quien pidió no recibirlos.
     */
    private int limpiarAgenteCupo() {
        try {
            LocalDate mesActual = LocalDate.now(Constants.ZONA_CR).withDayOfMonth(1);
            int total = borrarPorMes("hot_click_agente_conv_mes_tb", mesActual.minusMonths(3));
            total += borrarPorMes("hot_click_agente_uso_mes_tb", mesActual.minusMonths(24));
            return total;
        } catch (Exception e) {
            log.warn("[retention] agente_cupo: tabla no disponible, omitiendo — {}", e.getClass().getSimpleName());
            return 0;
        }
    }

    /** AG-32 y AG-35: avisos de Meta (90 días) y guarda de reseña por pedido (365 días). Lotes de 500. */
    private int limpiarAgenteMetricas() {
        try {
            java.time.OffsetDateTime ahora = java.time.OffsetDateTime.now(Constants.ZONA_CR);
            int n = jdbc.update(
                "DELETE FROM hot_click_agente_alerta_meta_tb WHERE ctid IN (" +
                "SELECT ctid FROM hot_click_agente_alerta_meta_tb WHERE creado_en < ? LIMIT 500)",
                ahora.minusDays(Constants.DIAS_RETENCION_AGENTE_ALERTA_META));
            n += jdbc.update(
                "DELETE FROM hot_click_agente_resena_aviso_tb WHERE ctid IN (" +
                "SELECT ctid FROM hot_click_agente_resena_aviso_tb WHERE enviado_en < ? LIMIT 500)",
                ahora.minusDays(Constants.DIAS_RETENCION_AGENTE_RESENA_AVISO));
            if (n > 0) log.info("[retention] agente_alerta_meta/resena_aviso: {} eliminados", n);
            return n;
        } catch (Exception e) {
            log.warn("[retention] agente_metricas: tabla no disponible, omitiendo — {}", e.getClass().getSimpleName());
            return 0;
        }
    }

    /** Nombres de tabla fijos del propio código (nunca entrada externa). Lotes de 500. */
    private int borrarPorMes(String tabla, LocalDate corte) {
        int total = 0, n;
        do {
            n = jdbc.update(
                "DELETE FROM " + tabla + " WHERE ctid IN (" +
                "SELECT ctid FROM " + tabla + " WHERE mes < ? LIMIT 500)", corte);
            total += n;
        } while (n == 500);
        if (total > 0) log.info("[retention] {}: {} eliminados", tabla, total);
        return total;
    }

    private int limpiarWebhookEvents() {
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(90);
        int n = jdbc.update(
            "DELETE FROM hot_click_webhook_event_tb WHERE ctid IN (" +
            "  SELECT ctid FROM hot_click_webhook_event_tb " +
            "  WHERE procesado = true AND fecha_recepcion < ? LIMIT 500" +
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
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(7);
        int n = jdbc.update("DELETE FROM shedlock WHERE lock_until < ?", corte);
        return n;
    }

    private int limpiarColaFacturacionOffline() {
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(30);
        int n = jdbc.update(
            "DELETE FROM hot_click_cola_facturacion_offline_tb WHERE ctid IN (" +
            "  SELECT ctid FROM hot_click_cola_facturacion_offline_tb " +
            "  WHERE estado IN ('COMPLETADO', 'AGOTADO') AND fecha_creacion < ? LIMIT 500" +
            ")",
            corte);
        if (n > 0) log.info("[retention] cola_facturacion_offline: {} eliminados (> 30 días, COMPLETADO/AGOTADO)", n);
        return n;
    }

    private int expirarIpsBloqueadas() {
        try {
            var expiradas = ipBloqueadaRepo.findByActivaTrueAndExpiresAtBefore(LocalDateTime.now(Constants.ZONA_CR));
            if (expiradas.isEmpty()) return 0;
            expiradas.forEach(ip -> ip.setActiva(false));
            ipBloqueadaRepo.saveAll(expiradas);
            log.info("[retention] ip_bloqueada: {} IPs expiradas desactivadas", expiradas.size());
            return expiradas.size();
        } catch (Exception e) {
            log.warn("[retention] ip_bloqueada: error al expirar IPs — {}", e.getMessage());
            return 0;
        }
    }

    private int limpiarSesionesChatAsistente() {
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(30);
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

    private int marcarEncargosVencidos() {
        try {
            int n = encargoService.marcarVencidos();
            if (n > 0) log.info("[retention] encargos: {} marcados VENCIDO (con email)", n);
            return n;
        } catch (Exception e) {
            log.warn("[retention] encargos vencidos: {}", e.getMessage());
            return 0;
        }
    }

    private int limpiarEncargosViejos() {
        try {
            LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(90);
            int n = jdbc.update(
                "DELETE FROM hot_click_encargo_tb WHERE ctid IN (" +
                "SELECT ctid FROM hot_click_encargo_tb " +
                "WHERE estado IN ('RECHAZADO', 'VENCIDO') AND fecha_creacion < ? LIMIT 500)",
                corte);
            if (n > 0) log.info("[retention] encargos: {} eliminados (> 90 días RECHAZADO/VENCIDO)", n);
            return n;
        } catch (Exception e) {
            log.warn("[retention] encargos limpieza: {}", e.getMessage());
            return 0;
        }
    }

    private int limpiarEmbudoSesiones() {
        try {
            LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR)
                    .minusDays(Constants.DIAS_RETENCION_EMBUDO_SESION);
            int n = jdbc.update(
                "DELETE FROM hot_click_embudo_sesion_tb WHERE ctid IN (" +
                "SELECT ctid FROM hot_click_embudo_sesion_tb WHERE actualizado_en < ? LIMIT 500)",
                corte);
            if (n > 0) log.info("[retention] embudo_sesion: {} eliminados (> 90 días)", n);
            return n;
        } catch (Exception e) {
            log.warn("[retention] embudo_sesion: tabla no disponible, omitiendo — {}", e.getMessage());
            return 0;
        }
    }
}
