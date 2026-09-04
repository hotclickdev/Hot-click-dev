package com.hotclick.repository;

import com.hotclick.model.FacturaSaas;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FacturaSaasRepository extends JpaRepository<FacturaSaas, Long> {

    Page<FacturaSaas> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId, Pageable pageable);

    Optional<FacturaSaas> findByStripeInvoiceId(String stripeInvoiceId);

    long countByEmpresaIdAndEstado(Long empresaId, String estado);

    @Query("""
        SELECT f.empresa.id, COUNT(f) FROM FacturaSaas f
        WHERE f.estado = :estado
        GROUP BY f.empresa.id
        """)
    List<Object[]> countPorEmpresaAndEstado(@Param("estado") String estado);
}
