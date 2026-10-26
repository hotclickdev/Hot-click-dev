package com.hotclick.repository;

import com.hotclick.model.StripeEvento;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface StripeEventoRepository extends JpaRepository<StripeEvento, String> {

    /**
     * SELECT ... FOR UPDATE — serializa reintentos concurrentes del mismo evento.
     * Usar solo dentro de @Transactional para que el lock se libere al finalizar.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM StripeEvento e WHERE e.stripeEventId = :id")
    Optional<StripeEvento> findByIdForUpdate(@Param("id") String id);

    /**
     * Registra el evento con INSERT + flush inmediato; la PK (stripe_event_id) es la clave de dedupe.
     * SQL portable (Postgres y H2). Si dos entregas pasan el NOT EXISTS a la vez, la segunda espera el lock
     * de la PK y falla con violación de unicidad (DataIntegrityViolationException), que el handler mapea a DUPLICADO.
     * @return 1 si se insertó, 0 si ya existía.
     */
    @Modifying(flushAutomatically = true)
    @Query(value = "INSERT INTO hot_click_stripe_evento_tb (stripe_event_id, tipo, procesado_ok, fecha_recibido) "
        + "SELECT :id, :tipo, false, :ahora WHERE NOT EXISTS "
        + "(SELECT 1 FROM hot_click_stripe_evento_tb WHERE stripe_event_id = :id)", nativeQuery = true)
    int insertarSiNoExiste(@Param("id") String id, @Param("tipo") String tipo, @Param("ahora") LocalDateTime ahora);
}
