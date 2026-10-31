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
import java.util.concurrent.FutureTask;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Qualifier;

/**
 * MEDIO área 1 (4610d4748): ONVO cobró un grupo ya CANCELADO y el pago quedó REEMBOLSO_PENDIENTE.
 * Avisa por correo al admin IT con el mecanismo existente ({@link NotificacionEmailService}, {@code adminit.email}).
 * <ul>
 *   <li>Dedupe por pago: UPDATE condicional sobre {@code aviso_reembolso_admin_en IS NULL} (V216); un webhook o
 *       reintento repetido no reclama de nuevo y no manda otro correo.</li>
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

    /** Executor @Async existente (AsyncConfig.taskExecutor): el envío no bloquea sin límite al hilo del webhook. */
    @Autowired @Qualifier("taskExecutor") private Executor taskExecutor;

    /** Timeout del envío; configurable en application.properties (hotclick.aviso-reembolso.timeout-ms). */
    @Value("${hotclick.aviso-reembolso.timeout-ms}")
    private long timeoutMs;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl = "https://hotclick.lat";

    /** Registra el aviso para después del commit; sin transacción activa lo manda ya. Nunca lanza. */
    public void avisarDespuesDelCommit(Long pagoId) {
        if (pagoId == null) return;
        try {
            if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                avisar(pagoId);
                return;
            }
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { avisar(pagoId); }
            });
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo programar el aviso de reembolso pendiente: pagoId={} error={}",
                pagoId, e.getClass().getSimpleName());
        }
    }

    /** Reclama el aviso (dedupe) y manda el correo. Devuelve true si se envió. Nunca lanza. */
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
            String link = linkAdmin();
            // taskExecutor ya propaga TenantContext (TenantAwareTaskDecorator); espera acotada por timeout.
            FutureTask<Void> envio = new FutureTask<>(() -> {
                notificacionEmailService.enviarAvisoReembolsoPendienteAAdminIT(
                    pagoId, Constants.PAGO_REEMBOLSO_PENDIENTE, link);
                return null;
            });
            taskExecutor.execute(envio);
            try {
                envio.get(timeoutMs, TimeUnit.MILLISECONDS);
            } finally {
                if (!envio.isDone()) envio.cancel(true);
            }
            log.info("[pago] Aviso de reembolso pendiente enviado al admin: pagoId={}", pagoId);
            return true;
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            Throwable causa = e instanceof java.util.concurrent.ExecutionException && e.getCause() != null ? e.getCause() : e;
            log.error("[ALERTA-PAGO] Falló el correo al admin por reembolso pendiente: pagoId={} error={}",
                pagoId, causa.getClass().getSimpleName());
            liberar(pagoId);
            return false;
        }
    }

    /** Si el envío falló o venció el timeout, vuelve la marca a NULL (transacción propia) para que un reintento avise. Nunca lanza. */
    void liberar(Long pagoId) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.execute(st -> em.createQuery(
                    "UPDATE Pago p SET p.avisoReembolsoAdminEn = NULL WHERE p.id = :id AND p.avisoReembolsoAdminEn IS NOT NULL")
                .setParameter("id", pagoId)
                .executeUpdate());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo liberar el aviso de reembolso pendiente: pagoId={} error={}",
                pagoId, e.getClass().getSimpleName());
        }
    }

    /** UPDATE condicional en transacción propia: solo la primera entrega gana (1 fila). */
    boolean reclamar(Long pagoId) {
        TransactionTemplate tx = new TransactionTemplate(txManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Integer filas = tx.execute(st -> em.createQuery(
                "UPDATE Pago p SET p.avisoReembolsoAdminEn = :ahora WHERE p.id = :id "
                    + "AND p.avisoReembolsoAdminEn IS NULL AND p.estadoPago = :estado")
            .setParameter("ahora", LocalDateTime.now(Constants.ZONA_CR))
            .setParameter("id", pagoId)
            .setParameter("estado", Constants.PAGO_REEMBOLSO_PENDIENTE)
            .executeUpdate());
        return filas != null && filas == 1;
    }

    String linkAdmin() {
        String base = appUrl == null ? "" : appUrl.replaceAll("/+$", "");
        return base + RUTA_ADMIN;
    }
}
