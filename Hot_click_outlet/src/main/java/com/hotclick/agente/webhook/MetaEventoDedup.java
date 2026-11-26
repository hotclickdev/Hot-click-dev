package com.hotclick.agente.webhook;

import com.hotclick.repository.CanalEventoProcesadoRepository;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Meta reintenta el mismo webhook si no recibe 200 a tiempo. Sin esto, un mensaje del cliente se contestaría
 * dos veces.
 *
 * <p>Mismo diseño que {@code TelegramUpdateDedup}: capa 1 en memoria; capa 2 persistente con INSERT atómico en
 * transacción propia (REQUIRES_NEW) ANTES de procesar. Duplicado → no se procesa. Falla de BD → fail-closed: no se
 * procesa (el webhook igual responde 200 para que Meta no reintente en bucle).
 */
@Component
public class MetaEventoDedup {

    private static final Logger log = LoggerFactory.getLogger(MetaEventoDedup.class);
    private static final long TTL_MS = 15L * 60L * 1000L;
    static final int DIAS_RETENCION = 7;

    private final ConcurrentHashMap<String, Long> vistos = new ConcurrentHashMap<>();
    private final CanalEventoProcesadoRepository repo;
    private final TransactionTemplate tx;

    public MetaEventoDedup(CanalEventoProcesadoRepository repo, PlatformTransactionManager txManager) {
        this.repo = repo;
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** true solo la primera vez que llega ese id de mensaje (y quedó marcado en BD). */
    public boolean esNuevo(String mensajeId, MensajeEntrante.Canal canal) {
        if (mensajeId == null || mensajeId.isBlank()) return false;
        long ahora = System.currentTimeMillis();
        if (vistos.size() > 5_000) vistos.entrySet().removeIf(e -> ahora - e.getValue() > TTL_MS);
        if (vistos.putIfAbsent(mensajeId, ahora) != null) return false;
        try {
            tx.executeWithoutResult(s -> repo.insertar(mensajeId, canal.name(), LocalDateTime.now(Constants.ZONA_CR)));
            return true;
        } catch (DataIntegrityViolationException dup) {
            return false;
        } catch (RuntimeException e) {
            log.error("[meta-dedup] no se pudo marcar un mensaje de {}; se descarta (fail-closed): {}",
                canal, e.getClass().getName());
            return false;
        }
    }

    @Scheduled(cron = "0 45 3 * * *", zone = "America/Costa_Rica")
    @SchedulerLock(name = "meta_evento_dedup_purga", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void purgarPersistidos() {
        LocalDateTime limite = LocalDateTime.now(Constants.ZONA_CR).minusDays(DIAS_RETENCION);
        try {
            Integer n = tx.execute(s -> repo.borrarAnteriores(limite));
            log.info("[meta-dedup] purga: {} marcas anteriores a {} días", n, DIAS_RETENCION);
        } catch (RuntimeException e) {
            log.warn("[meta-dedup] purga falló: {}", e.getClass().getName());
        }
    }
}
