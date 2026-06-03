package com.hotclick.repository;

import com.hotclick.model.Suscripcion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SuscripcionRepository extends JpaRepository<Suscripcion, Long> {

    Optional<Suscripcion> findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(
            Long empresaId, String estado);

    @Query("SELECT s FROM Suscripcion s WHERE s.empresa.id = :empresaId " +
           "AND s.estado NOT IN ('CANCELADO', 'VENCIDO') " +
           "ORDER BY s.fechaCreacion DESC")
    Optional<Suscripcion> findActivaByEmpresaId(@Param("empresaId") Long empresaId);

    Optional<Suscripcion> findByStripeSubscriptionId(String stripeSubscriptionId);

    /** Trials vencidos que aún están en estado TRIAL */
    @Query("SELECT s FROM Suscripcion s WHERE s.estado = 'TRIAL' AND s.trialEnd < :hoy")
    List<Suscripcion> findTrialsVencidos(@Param("hoy") LocalDate hoy);

    /** Suscripciones PAST_DUE con fecha_fin pasada */
    @Query("SELECT s FROM Suscripcion s WHERE s.estado = 'PAST_DUE' AND s.fechaFin < :hoy")
    List<Suscripcion> findPastDueVencidos(@Param("hoy") LocalDate hoy);

    // ── Batch methods para BillingRenewalScheduler ────────────────────────────

    /** IDs de empresas con trial vencido — leer ANTES del batch update para evicción de cache. */
    @Query("SELECT s.empresa.id FROM Suscripcion s WHERE s.estado = 'TRIAL' AND s.trialEnd < :hoy")
    List<Long> findEmpresaIdsTrialsVencidos(@Param("hoy") LocalDate hoy);

    /** Expira en un solo UPDATE todos los trials vencidos. */
    @Modifying
    @Transactional
    @Query("UPDATE Suscripcion s SET s.estado = 'VENCIDO' WHERE s.estado = 'TRIAL' AND s.trialEnd < :hoy")
    int expirarTrialsBatch(@Param("hoy") LocalDate hoy);

    /** IDs de empresas con PAST_DUE vencido — leer ANTES del batch update. */
    @Query("SELECT s.empresa.id FROM Suscripcion s WHERE s.estado = 'PAST_DUE' AND s.fechaFin < :hoy")
    List<Long> findEmpresaIdsPastDueVencidos(@Param("hoy") LocalDate hoy);

    /** Expira en un solo UPDATE todos los PAST_DUE vencidos. */
    @Modifying
    @Transactional
    @Query("UPDATE Suscripcion s SET s.estado = 'VENCIDO' WHERE s.estado = 'PAST_DUE' AND s.fechaFin < :hoy")
    int expirarPastDueBatch(@Param("hoy") LocalDate hoy);
}
