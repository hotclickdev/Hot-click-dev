package com.hotclick.repository;

import com.hotclick.model.BillingLedger;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BillingLedgerRepository extends JpaRepository<BillingLedger, Long> {

    List<BillingLedger> findByEmpresaIdOrderByFechaEventoDesc(Long empresaId, Pageable pageable);

    long countByEmpresaIdAndTipo(Long empresaId, String tipo);

    @Query("""
        SELECT l.empresa.id, COUNT(l) FROM BillingLedger l
        WHERE l.tipo = :tipo
        GROUP BY l.empresa.id
        """)
    List<Object[]> countPorEmpresaAndTipo(@Param("tipo") String tipo);

    boolean existsByReferenciaExternaAndTipo(String referenciaExterna, String tipo);
}
