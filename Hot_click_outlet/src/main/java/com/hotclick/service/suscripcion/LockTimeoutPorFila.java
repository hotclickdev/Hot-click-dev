package com.hotclick.service.suscripcion;

import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Limita la espera por el lock de la fila ({@code SELECT ... FOR UPDATE}) dentro de la transacción por fila de la
 * reconsulta (REQUIRES_NEW). Sin tope, un webhook que tenga la misma fila bloqueada dejaría colgada la corrida de
 * las 03:00. {@code SET LOCAL} vale solo para la transacción en curso. Solo PostgreSQL; en otras bases no hace nada.
 */
@Component
public class LockTimeoutPorFila {

    private static final Logger log = LoggerFactory.getLogger(LockTimeoutPorFila.class);

    private final EntityManager em;
    private final int lockTimeoutMs;

    public LockTimeoutPorFila(EntityManager em, OnvoReconsultaConfig config) {
        this.em = em;
        this.lockTimeoutMs = config.lockTimeoutMs();
    }

    /** Debe llamarse dentro de la transacción por fila, antes de tomar el lock. */
    public void aplicar() {
        if (lockTimeoutMs <= 0 || !esPostgres()) return;
        em.createNativeQuery("SET LOCAL lock_timeout = " + lockTimeoutMs).executeUpdate();
    }

    private boolean esPostgres() {
        try {
            String producto = em.unwrap(Session.class).doReturningWork(c -> c.getMetaData().getDatabaseProductName());
            return producto != null && producto.toLowerCase(java.util.Locale.ROOT).contains("postgres");
        } catch (RuntimeException e) {
            log.warn("[billing-onvo] No se pudo determinar la base para lock_timeout: {}", e.getClass().getSimpleName());
            return false;
        }
    }
}
