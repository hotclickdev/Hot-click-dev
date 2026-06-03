package com.hotclick.repository;

import com.hotclick.model.FacturaSaas;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FacturaSaasRepository extends JpaRepository<FacturaSaas, Long> {

    Page<FacturaSaas> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId, Pageable pageable);

    Optional<FacturaSaas> findByStripeInvoiceId(String stripeInvoiceId);
}
