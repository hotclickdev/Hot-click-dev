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

    /**
     * Executor propio (AsyncConfig.avisoReembolsoExecutor): el envío corre fuera del hilo del webhook y, con la cola
     * llena, se rechaza en vez de correr en el hilo que encola (BAJO 1 #477).
     */
    @Autowired @Qualifier("avisoReembolsoExecutor") private Executor taskExecutor;

    /** Tope por pasada del barrido: no más de {@code lote} pagos ni de {@code maxSegundos} (lockAtMostFor = PT9M). */
    @Value("${hotclick.aviso-reembolso.barrido.lote:20}")
    private int lote = 20;
    @Value("${hotclick.aviso-reembolso.barrido.max-segundos:300}")
    private long maxSegundos = 300;

    /** Lease del claim: un claim sin envío confirmado más viejo que esto lo reintenta el barrido. */
    @Value("${hotclick.aviso-reembolso.lease-minutos:15}")
    private long leaseMinutos = 15;

    /** Tope de pagos por correo resumen (punto 4 #477); el resto va en el próximo barrido. */
    @Value("${hotclick.aviso-reembolso.resumen.lote:200}")
    private int resumenLote = 200;

    /** Tope de intentos (claims) por pago; después queda solo el log de ALERTA. */
    @Value("${hotclick.aviso-reembolso.max-intentos:5}")
    private int maxIntentos = 5;

    @Value("${hotclick.aviso-reembolso.barrido.enabled:true}")
    private boolean barridoHabilitado = true;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl = "https://hotclick.lat";

    /**
     * Todo REEMBOLSO_PENDIENTE nuevo (ONVO sobre cancelado, SINPE vía ONVO, sobreventa) entra por acá, DENTRO de la
     * transacción que cambia el estado: deja la marca pendiente (claim ya vencido, sin intento) en el mismo commit,
     * así si el proceso cae antes del despacho el barrido igual lo ve. Después del commit, despacha. Nunca lanza.
     */
    public void registrarPendiente(com.hotclick.model.Pago pago) {
        if (pago == null) return;
        marcarPendienteEnTransaccion(pago);
        avisarDespuesDelCommit(pago.getId());
    }

    /**
     * Solo la marca (sobre la entidad gestionada; sale en el commit de quien llama). Es el estado que queda si el
     * proceso cae entre el commit y el despacho: el barrido lo toma porque el claim ya nace vencido. Nunca lanza.
     */
    public void marcarPendienteEnTransaccion(com.hotclick.model.Pago pago) {
        try {
            if (pago.getAvisoReembolsoAdminEn() == null && pago.getAvisoReembolsoAdminEnviadoEn() == null) {
                pago.setAvisoReembolsoAdminEn(marcaPendiente());
            }
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo dejar la marca de aviso pendiente: pagoId={} error={}",
                pago.getId(), e.getClass().getSimpleName());
        }
    }

    /** Claim ya vencido (sin intento): el despacho o el barrido lo reclaman de inmediato. */
    private LocalDateTime marcaPendiente() {
        return venceLease().minusMinutes(1);
    }

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
        } catch (java.util.concurrent.RejectedExecutionException e) {
            log.warn("[pago] Aviso de reembolso pendiente descartado por cola llena; lo reintenta el barrido: pagoId={}", pagoId);
            marcarParaBarrido(pagoId);
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
                pagoId, Constants.PAGO_REEMBOLSO_PENDIENTE, linkAdmin(), origenDe(pagoId), detalleDe(pagoId));
        } catch (com.hotclick.service.email.AdminItSinCorreoException e) {
            log.error("[ALERTA-PAGO] Aviso de reembolso pendiente sin destinatario (adminit.email vacío); no se marca enviado: pagoId={}", pagoId);
            alertarSiAgotado(List.of(pagoId));
            return false;
        } catch (RuntimeException e) {
            Throwable causa = e.getCause() != null ? e.getCause() : e;
            log.error("[ALERTA-PAGO] Falló o no se confirmó el correo al admin por reembolso pendiente: pagoId={} error={}"
                + " (se reintenta por barrido al vencer el lease de {} min)", pagoId, causa.getClass().getSimpleName(), leaseMinutos);
            alertarSiAgotado(List.of(pagoId));
            return false;
        }
        marcarEnviado(pagoId);
        log.info("[pago] Aviso de reembolso pendiente enviado al admin: pagoId={}", pagoId);
        return true;
    }

    /**
     * BAJO #466 (marca huérfana): reintenta los REEMBOLSO_PENDIENTE sin envío confirmado cuyo claim venció el lease
     * (incluye los descartados por cola llena), con tope de intentos. Antes manda el resumen de los viejos (punto 4).
     */
    @Scheduled(fixedDelay = 600_000, initialDelay = 300_000)
    @SchedulerLock(name = "aviso_reembolso_barrido", lockAtMostFor = "PT9M", lockAtLeastFor = "PT1M")
    public void barridoProgramado() {
        if (barridoHabilitado) barrer();
    }

    /** Devuelve cuántos avisos individuales se confirmaron en esta pasada (el resumen no cuenta). Nunca lanza. */
    public int barrer() {
        long limite = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(Math.max(0, maxSegundos));
        enviarResumenViejos(limite);
        List<Long> ids;
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setReadOnly(true);
            ids = tx.execute(st -> em.createQuery(
                    "SELECT p.id FROM Pago p WHERE p.estadoPago = :estado AND p.avisoReembolsoAdminEnviadoEn IS NULL "
                        + "AND p.avisoReembolsoResumenPendiente = false AND p.avisoReembolsoAdminIntentos < :max "
                        + "AND p.avisoReembolsoAdminEn IS NOT NULL AND p.avisoReembolsoAdminEn < :vence ORDER BY p.id", Long.class)
                .setParameter("estado", Constants.PAGO_REEMBOLSO_PENDIENTE)
                .setParameter("max", maxIntentos)
                .setParameter("vence", venceLease())
                .setMaxResults(Math.max(1, lote))
                .getResultList());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] Barrido de avisos de reembolso falló: error={}", e.getClass().getSimpleName());
            return 0;
        }
        int enviados = 0;
        int procesados = 0;
        for (Long id : ids) {
            if (System.nanoTime() >= limite) {
                log.warn("[pago] Barrido de avisos de reembolso cortado por tiempo: procesados={} pendientes={}",
                    procesados, ids.size() - procesados);
                break;
            }
            procesados++;
            if (avisar(id)) enviados++;
        }
        if (!ids.isEmpty()) log.info("[pago] Barrido de avisos de reembolso: candidatos={} enviados={}", ids.size(), enviados);
        return enviados;
    }

    /**
     * Punto 4 de #477 (decisión del Mentor): los REEMBOLSO_PENDIENTE anteriores a V217 que nunca se avisaron van en
     * UN correo resumen (id, monto, fecha). Solo si sale se marcan todos como avisados; si falla o falta
     * adminit.email quedan pendientes para el próximo barrido. Devuelve true si se envió. Nunca lanza.
     */
    public boolean enviarResumenViejos() {
        return enviarResumenViejos(System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(Math.max(0, maxSegundos)));
    }

    /**
     * Respeta el tope del barrido: no arranca si ya no queda tiempo y toma a lo sumo {@code resumenLote} pagos.
     * Reclama primero (claim con lease + intento, transacción propia) y solo después envía: si el envío sale pero
     * falla el marcado, el claim vigente evita repetirlo durante el lease y el tope de intentos lo acota.
     * Si el envío falla, se libera el claim (el intento queda contado) y el próximo barrido lo incluye.
     */
    public boolean enviarResumenViejos(long limite) {
        if (System.nanoTime() >= limite) {
            log.warn("[pago] Resumen de reembolsos pendientes viejos postergado: sin tiempo en esta pasada del barrido");
            return false;
        }
        List<Object[]> filas;
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setReadOnly(true);
            filas = tx.execute(st -> em.createQuery(
                    "SELECT p.id, p.monto, p.moneda, p.fechaCreacion, p.proveedor, p.metodoPagoTipo, p.merchantToken, ped.estadoPedido "
                        + "FROM Pago p LEFT JOIN p.pedido ped WHERE p.avisoReembolsoResumenPendiente = true "
                        + "AND p.estadoPago = :estado AND p.avisoReembolsoAdminEnviadoEn IS NULL "
                        + "AND p.avisoReembolsoAdminIntentos < :max "
                        + "AND (p.avisoReembolsoAdminEn IS NULL OR p.avisoReembolsoAdminEn < :vence) ORDER BY p.id", Object[].class)
                .setParameter("estado", Constants.PAGO_REEMBOLSO_PENDIENTE)
                .setParameter("max", maxIntentos)
                .setParameter("vence", venceLease())
                .setMaxResults(Math.max(1, resumenLote))
                .getResultList());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudieron leer los reembolsos pendientes viejos: error={}", e.getClass().getSimpleName());
            return false;
        }
        if (filas == null || filas.isEmpty()) return false;
        List<com.hotclick.service.email.ReembolsoPendienteResumenItem> items = new java.util.ArrayList<>();
        List<Long> ids = new java.util.ArrayList<>();
        for (Object[] f : filas) {
            ids.add((Long) f[0]);
            items.add(new com.hotclick.service.email.ReembolsoPendienteResumenItem(
                (Long) f[0], (Integer) f[1], (String) f[2], (LocalDateTime) f[3],
                origen((String) f[4], (String) f[5], (String) f[6], (String) f[7])));
        }
        List<Long> reclamados;
        try {
            reclamados = reclamarResumen(ids);
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo reclamar el resumen de reembolsos viejos: error={}", e.getClass().getSimpleName());
            return false;
        }
        if (reclamados.isEmpty()) return false;
        items.removeIf(i -> !reclamados.contains(i.pagoId()));
        ids.retainAll(reclamados);
        try {
            notificacionEmailService.enviarResumenReembolsosPendientesAAdminIT(items, linkAdmin());
        } catch (com.hotclick.service.email.AdminItSinCorreoException e) {
            log.error("[ALERTA-PAGO] Resumen de reembolsos pendientes viejos sin destinatario (adminit.email vacío); "
                + "no se marcan avisados: pagos={}", ids.size());
            liberarResumen(ids);
            alertarSiAgotado(ids);
            return false;
        } catch (RuntimeException e) {
            Throwable causa = e.getCause() != null ? e.getCause() : e;
            log.error("[ALERTA-PAGO] Falló el resumen de reembolsos pendientes viejos; se reintenta en el próximo barrido: pagos={} error={}",
                ids.size(), causa.getClass().getSimpleName());
            liberarResumen(ids);
            alertarSiAgotado(ids);
            return false;
        }
        try {
            LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.execute(st -> em.createQuery(
                    "UPDATE Pago p SET p.avisoReembolsoResumenPendiente = false, p.avisoReembolsoAdminEn = :ahora, "
                        + "p.avisoReembolsoAdminEnviadoEn = :ahora WHERE p.id IN :ids")
                .setParameter("ahora", ahora)
                .setParameter("ids", ids)
                .executeUpdate());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] Resumen enviado pero sin marcar en BD (se repite como mucho al vencer el lease, con tope de intentos): pagos={} error={}",
                ids.size(), e.getClass().getSimpleName());
        }
        log.info("[pago] Resumen de reembolsos pendientes viejos enviado al admin: pagos={}", ids.size());
        return true;
    }

    /** Claim del resumen (lease + intento) en transacción propia; devuelve los ids que ganó esta pasada. */
    public List<Long> reclamarResumen(List<Long> ids) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        TransactionTemplate tx = new TransactionTemplate(txManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tx.execute(st -> {
            List<Long> ganados = new java.util.ArrayList<>();
            for (Long id : ids) {
                int n = em.createQuery("UPDATE Pago p SET p.avisoReembolsoAdminEn = :ahora, "
                        + "p.avisoReembolsoAdminIntentos = p.avisoReembolsoAdminIntentos + 1 WHERE p.id = :id "
                        + "AND p.avisoReembolsoResumenPendiente = true AND p.avisoReembolsoAdminEnviadoEn IS NULL "
                        + "AND p.avisoReembolsoAdminIntentos < :max "
                        + "AND (p.avisoReembolsoAdminEn IS NULL OR p.avisoReembolsoAdminEn < :vence)")
                    .setParameter("ahora", ahora).setParameter("id", id)
                    .setParameter("max", maxIntentos).setParameter("vence", venceLease())
                    .executeUpdate();
                if (n == 1) ganados.add(id);
            }
            return ganados;
        });
    }

    /** BAJO #479: con el último intento fallido el aviso ya no se reintenta; queda una alerta con solo el id. */
    void alertarSiAgotado(List<Long> ids) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setReadOnly(true);
            List<Long> agotados = tx.execute(st -> em.createQuery("SELECT p.id FROM Pago p WHERE p.id IN :ids "
                    + "AND p.avisoReembolsoAdminEnviadoEn IS NULL AND p.avisoReembolsoAdminIntentos >= :max", Long.class)
                .setParameter("ids", ids).setParameter("max", maxIntentos).getResultList());
            if (agotados != null) {
                agotados.forEach(id -> log.error("[ALERTA-PAGO] Aviso de reembolso pendiente: intentos agotados: pagoId={}", id));
            }
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo verificar intentos agotados: error={}", e.getClass().getSimpleName());
        }
    }

    /** Envío del resumen fallido: suelta el claim para que el próximo barrido los incluya (el intento queda contado). */
    private void liberarResumen(List<Long> ids) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.execute(st -> em.createQuery("UPDATE Pago p SET p.avisoReembolsoAdminEn = NULL WHERE p.id IN :ids "
                    + "AND p.avisoReembolsoAdminEnviadoEn IS NULL").setParameter("ids", ids).executeUpdate());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo liberar el claim del resumen; se reintenta al vencer el lease: pagos={} error={}",
                ids.size(), e.getClass().getSimpleName());
        }
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
                    + "AND p.avisoReembolsoResumenPendiente = false "
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

    /**
     * Cola llena: deja un claim ya vencido (sin intento) para que el próximo barrido lo tome. El barrido solo mira
     * pagos con claim, así no avisa REEMBOLSO_PENDIENTE de otros orígenes (SINPE, sobreventa) que no usan este aviso.
     */
    public void marcarParaBarrido(Long pagoId) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.execute(st -> em.createQuery(
                    "UPDATE Pago p SET p.avisoReembolsoAdminEn = :vencido WHERE p.id = :id AND p.avisoReembolsoAdminEn IS NULL "
                        + "AND p.estadoPago = :estado")
                .setParameter("vencido", venceLease().minusMinutes(1))
                .setParameter("id", pagoId)
                .setParameter("estado", Constants.PAGO_REEMBOLSO_PENDIENTE)
                .executeUpdate());
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] Aviso descartado y sin marca para el barrido: pagoId={} error={}",
                pagoId, e.getClass().getSimpleName());
        }
    }

    /**
     * Detalle operativo del aviso (antes en la alerta de sobreventa): números de pedido del grupo en revisión o
     * cancelados, monto y proveedor. Sin PII. Si la lectura falla, null: el aviso sale igual sin detalle.
     */
    com.hotclick.service.email.AvisoReembolsoDetalle detalleDe(Long pagoId) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setReadOnly(true);
            return tx.execute(st -> {
                List<Object[]> f = em.createQuery(
                        "SELECT p.monto, p.proveedor, ped.numeroPedido, ped.grupoPago FROM Pago p "
                            + "LEFT JOIN p.pedido ped WHERE p.id = :id", Object[].class)
                    .setParameter("id", pagoId).getResultList();
                if (f.isEmpty()) return null;
                Object[] r = f.get(0);
                String pedidos = (String) r[2];
                String grupo = (String) r[3];
                if (grupo != null && !grupo.isBlank()) {
                    List<String> nums = em.createQuery("SELECT x.numeroPedido FROM Pedido x WHERE x.grupoPago = :g "
                            + "AND x.estadoPedido IN :est ORDER BY x.id", String.class)
                        .setParameter("g", grupo)
                        .setParameter("est", List.of(Constants.PEDIDO_REVISION_SOBREVENTA, Constants.PEDIDO_CANCELADO))
                        .getResultList();
                    if (!nums.isEmpty()) pedidos = String.join(",", nums);
                }
                return new com.hotclick.service.email.AvisoReembolsoDetalle(pedidos, (Integer) r[0], (String) r[1]);
            });
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Origen de un pago (lectura propia). Si la lectura falla, OTRO: el aviso sale igual. */
    com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen origenDe(Long pagoId) {
        try {
            TransactionTemplate tx = new TransactionTemplate(txManager);
            tx.setReadOnly(true);
            List<Object[]> f = tx.execute(st -> em.createQuery(
                    "SELECT p.proveedor, p.metodoPagoTipo, p.merchantToken, ped.estadoPedido FROM Pago p "
                        + "LEFT JOIN p.pedido ped WHERE p.id = :id", Object[].class)
                .setParameter("id", pagoId).getResultList());
            if (f == null || f.isEmpty()) return com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.OTRO;
            Object[] r = f.get(0);
            return origen((String) r[0], (String) r[1], (String) r[2], (String) r[3]);
        } catch (RuntimeException e) {
            return com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.OTRO;
        }
    }

    /**
     * Origen del REEMBOLSO_PENDIENTE según lo que dejó cada camino (no hay columna de origen):
     * sobreventa = grupo en REVISION_SOBREVENTA (PaymentOrderConfirmationService M-08); SINPE = intent SINPE de ONVO
     * ({@code ONVOPI:}) o proveedor/método SINPE; ONVO sobre cancelado = proveedor ONVO con pedido CANCELADO
     * (OnvoCapturaService); el resto (p. ej. otro proveedor sobre grupo cancelado) = OTRO.
     */
    static com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen origen(
            String proveedor, String metodoPagoTipo, String merchantToken, String estadoPedido) {
        var O = com.hotclick.service.email.ReembolsoPendienteResumenItem.Origen.class;
        if (Constants.PEDIDO_REVISION_SOBREVENTA.equals(estadoPedido)) return Enum.valueOf(O, "SOBREVENTA");
        if ((merchantToken != null && merchantToken.startsWith(com.hotclick.service.pos.PosSinpeOnvoService.PREFIJO_ONVO_PI))
                || Constants.PROVEEDOR_SINPE.equals(proveedor) || Constants.PROVEEDOR_SINPE.equals(metodoPagoTipo)) {
            return Enum.valueOf(O, "SINPE");
        }
        if (Constants.PROVEEDOR_ONVO.equals(proveedor) && Constants.PEDIDO_CANCELADO.equals(estadoPedido)) {
            return Enum.valueOf(O, "ONVO_CANCELADO");
        }
        return Enum.valueOf(O, "OTRO");
    }

    private LocalDateTime venceLease() {
        return LocalDateTime.now(Constants.ZONA_CR).minusMinutes(leaseMinutos);
    }

    String linkAdmin() {
        String base = appUrl == null ? "" : appUrl.replaceAll("/+$", "");
        return base + RUTA_ADMIN;
    }
}
