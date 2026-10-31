package com.hotclick.service.payment;

import com.hotclick.service.NotificacionEmailService;
import com.hotclick.utils.Constants;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Executor;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Qualifier;

/**
 * MEDIO área 1 (4610d4748): ONVO cobró un grupo ya CANCELADO y el pago quedó REEMBOLSO_PENDIENTE.
 * Avisa por correo al admin IT con el mecanismo existente ({@link NotificacionEmailService}, {@code adminit.email}).
 * <ul>
 *   <li>Dedupe por pago: UPDATE condicional (V216/V217). {@code aviso_reembolso_admin_en} es el claim con lease;
 *       {@code aviso_reembolso_admin_enviado_en} confirma el envío. Un webhook repetido dentro del lease no reenvía.</li>
 *   <li>No bloquea el webhook: el afterCommit encola en taskExecutor. Fallo o timeout no liberan la marca; reintenta
 *       el barrido (ShedLock) al vencer el lease, con tope de intentos.</li>
 *   <li>Sin PII: solo id interno del pago, estado y link al admin.</li>
 *   <li>Fail-safe: corre después del COMMIT de la captura y en su propia transacción; cualquier error se registra
 *       y no cambia el pago, que ya quedó REEMBOLSO_PENDIENTE.</li>
 * </ul>
 * Clase aislada a propósito: no toca PaymentOrderConfirmationService ni SobreventaResolucionService (#460).
 */
@Service
public class AvisoReembolsoPendienteService {

    private static final Logger log = LoggerFactory.getLogger(AvisoReembolsoPendienteService.class);
    static final String RUTA_ADMIN = "/plataforma/dinero/cobros";

    @PersistenceContext private EntityManager em;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private NotificacionEmailService notificacionEmailService;

    /** Executor @Async existente (AsyncConfig.taskExecutor, propaga TenantContext): el envío corre fuera del hilo del webhook. */
    @Autowired @Qualifier("taskExecutor") private Executor taskExecutor;

    /** Lease del claim: un claim sin envío confirmado más viejo que esto lo reintenta el barrido. */
    @Value("${hotclick.aviso-reembolso.lease-minutos:15}")
    private long leaseMinutos = 15;

    /** Tope de intentos (claims) por pago; después queda solo el log de ALERTA. */
    @Value("${hotclick.aviso-reembolso.max-intentos:5}")
    private int maxIntentos = 5;

    @Value("${hotclick.aviso-reembolso.barrido.enabled:true}")
    private boolean barridoHabilitado = true;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl = "https://hotclick.lat";

    /**
     * Registra el aviso para después del commit. BAJO #466: el afterCommit solo encola en taskExecutor y vuelve;
     * el webhook ya no espera el envío. Nunca lanza.
     */
    public void avisarDespuesDelCommit(Long pagoId) {
        if (pagoId == null) return;
        try {
            if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                despachar(pagoId);
                return;
            }
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { despachar(pagoId); }
            });
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo programar el aviso de reembolso pendiente: pagoId={} error={}",
                pagoId, e.getClass().getSimpleName());
        }
    }

    private void despachar(Long pagoId) {
        try {
            taskExecutor.execute(() -> avisar(pagoId));
        } catch (RuntimeException e) {
            // Si ni siquiera se pudo encolar, el barrido lo levanta (no hay claim todavía).
            log.error("[ALERTA-PAGO] No se pudo encolar el aviso de reembolso pendiente: pagoId={} error={}",
                pagoId, e.getClass().getSimpleName());
        }
    }

    /**
     * Reclama el aviso (dedupe + lease) y manda el correo en el hilo actual. Devuelve true si se confirmó el envío.
     * BAJO #466: ante cualquier fallo (incluido un timeout, donde el correo pudo haber salido) NO se libera la marca:
     * queda el claim sin {@code enviado_en} y solo el barrido reintenta cuando vence el lease. Nunca lanza.
     */
    public boolean avisar(Long pagoId) {
        boolean reclamado;
        try {
            reclamado = reclamar(pagoId);
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] Aviso de reembolso pendiente sin registrar (dedupe falló): pagoId={} error={}",
                pagoId, e.getClass().getSimpleName());
            return false;
        }
        if (!reclamado) return false;
        try {
            notificacionEmailService.enviarAvisoReembolsoPendienteAAdminIT(
                pagoId, Constants.PAGO_REEMBOLSO_PENDIENTE, linkAdmin());
        } catch (RuntimeException e) {
            Throwable causa = e.getCause() != null ? e.getCause() : e;
            log.error("[ALERTA-PAGO] Falló o no se confirmó el correo al admin por reembolso pendiente: pagoId={} error={}"
                + " (se reintenta por barrido al vencer el lease de {} min)", pagoId, causa.getClass().getSimpleName(), leaseMinutos);
            return false;
        }
        marcarEnviado(pagoId);
        log.info("[pago] Aviso de reembolso pendiente enviado al admin: pagoId={}", pagoId);
        return true;
    }

    /**
     * BAJO #466 (marca huérfana): reintenta los REEMBOLSO_PENDIENTE sin envío confirmado cuyo claim venció el lease
     * (o que nunca se reclamaron, p. ej. si el proceso murió entre commit y encolado), con tope de intentos.
     */
    @Scheduled(fixedDelay = 600_000, initialDelay = 300_000)
    @SchedulerLock(name = "aviso_reembolso_barrido", lockAtMostFor = "PT9M", lockAtLeastFor = "PT1M")
    public void barridoProgramado() {
        if (barridoHabilitado) barrer();
    }

    /** Devuelve cuántos avisos se confirmaron en esta pasada. Nunca lanza. */
    public int barrer() {
        List<Long> ids;
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setReadOnly(true);
            ids = tx.execute(st -> em.createQuery(
                    "SELECT p.id FROM Pago p WHERE p.estadoPago = :estado AND p.avisoReembolsoAdminEnviadoEn IS NULL "
                        + "AND p.avisoReembolsoAdminIntentos < :max "
                        + "AND (p.avisoReembolsoAdminEn IS NULL OR p.avisoReembolsoAdminEn < :vence) ORDER BY p.id", Long.class)
                .setParameter("estado", Constants.PAGO_REEMBOLSO_PENDIENTE)
                .setParameter("max", maxIntentos)
                .setParameter("vence", venceLease())
                .setMaxResults(50)
                .getResultList());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] Barrido de avisos de reembolso falló: error={}", e.getClass().getSimpleName());
            return 0;
        }
        int enviados = 0;
        for (Long id : ids) if (avisar(id)) enviados++;
        if (!ids.isEmpty()) log.info("[pago] Barrido de avisos de reembolso: candidatos={} enviados={}", ids.size(), enviados);
        return enviados;
    }

    /**
     * UPDATE condicional en transacción propia: gana una sola entrega (1 fila). Reclama si no hay claim o si el
     * claim venció el lease, siempre que no esté enviado y queden intentos.
     */
    boolean reclamar(Long pagoId) {
        TransactionTemplate tx = new TransactionTemplate(txManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Integer filas = tx.execute(st -> em.createQuery(
                "UPDATE Pago p SET p.avisoReembolsoAdminEn = :ahora, "
                    + "p.avisoReembolsoAdminIntentos = p.avisoReembolsoAdminIntentos + 1 WHERE p.id = :id "
                    + "AND (p.avisoReembolsoAdminEn IS NULL OR p.avisoReembolsoAdminEn < :vence) "
                    + "AND p.avisoReembolsoAdminEnviadoEn IS NULL AND p.avisoReembolsoAdminIntentos < :max "
                    + "AND p.estadoPago = :estado")
            .setParameter("ahora", LocalDateTime.now(Constants.ZONA_CR))
            .setParameter("vence", venceLease())
            .setParameter("max", maxIntentos)
            .setParameter("id", pagoId)
            .setParameter("estado", Constants.PAGO_REEMBOLSO_PENDIENTE)
            .executeUpdate());
        return filas != null && filas == 1;
    }

    /** Confirma el envío (transacción propia). Si falla, el barrido podría reenviar: se prefiere duplicar a perder el aviso. */
    void marcarEnviado(Long pagoId) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.execute(st -> em.createQuery(
                    "UPDATE Pago p SET p.avisoReembolsoAdminEnviadoEn = :ahora WHERE p.id = :id")
                .setParameter("ahora", LocalDateTime.now(Constants.ZONA_CR))
                .setParameter("id", pagoId)
                .executeUpdate());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] Aviso enviado pero sin confirmar en BD: pagoId={} error={}",
                pagoId, e.getClass().getSimpleName());
        }
    }

    private LocalDateTime venceLease() {
        return LocalDateTime.now(Constants.ZONA_CR).minusMinutes(leaseMinutos);
    }

    String linkAdmin() {
        String base = appUrl == null ? "" : appUrl.replaceAll("/+$", "");
        return base + RUTA_ADMIN;
    }
}
