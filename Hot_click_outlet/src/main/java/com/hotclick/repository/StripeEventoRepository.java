package com.hotclick.repository;

import com.hotclick.model.StripeEvento;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StripeEventoRepository extends JpaRepository<StripeEvento, String> {

    /**
     * SELECT ... FOR UPDATE — serializa reintentos concurrentes del mismo evento.
     * Usar solo dentro de @Transactional para que el lock se libere al finalizar.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM StripeEvento e WHERE e.stripeEventId = :id")
    Optional<StripeEvento> findByIdForUpdate(@Param("id") String id);
}
