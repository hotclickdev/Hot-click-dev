package com.hotclick.repository;

import com.hotclick.model.PayoutRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, Long> {

    Page<PayoutRequest> findByEmpresaIdOrderByFechaSolicitudDesc(Long empresaId, Pageable pageable);

    List<PayoutRequest> findByEstadoOrderByFechaSolicitudAsc(String estado);

    boolean existsByEmpresaIdAndEstadoIn(Long empresaId, List<String> estados);

    /**
     * SELECT FOR UPDATE — serializa aprobaciones/rechazos concurrentes del mismo payout.
     *
     * Si Admin-A y Admin-B intentan aprobar el mismo payout simultáneamente:
     *   - Admin-A adquiere el lock (FOR UPDATE)
     *   - Admin-B bloquea hasta que Admin-A hace commit
     *   - Tras el commit de Admin-A (estado → PAGADO), Admin-B re-evalúa y ve estado≠PENDIENTE
     *   - WalletService.aprobarPayout lanza IllegalStateException para Admin-B
     *
     * Usa native SQL con FOR UPDATE en lugar de @Lock(PESSIMISTIC_WRITE) para evitar
     * que Hibernate 6.6 genere FOR NO KEY UPDATE, que H2 no soporta.
     * FOR UPDATE en PostgreSQL es equivalente para este caso (PayoutRequest no tiene
     * hijos con FK que se actualicen en la misma TX).
     */
    @Query(value = "SELECT * FROM hot_click_payout_request_tb WHERE id_payout = :id FOR UPDATE",
           nativeQuery = true)
    Optional<PayoutRequest> findByIdForUpdate(@Param("id") Long id);
}
