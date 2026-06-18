package com.hotclick.repository;

import com.hotclick.model.WalletTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletTransaccionRepository extends JpaRepository<WalletTransaccion, Long> {

    Page<WalletTransaccion> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId, Pageable pageable);

    boolean existsByReferenciaTipoAndReferenciaId(String referenciaTipo, Long referenciaId);

    /** Último saldo registrado en el ledger para calcular saldo_tras_movimiento. */
    @Query("""
        SELECT COALESCE(MAX(t.saldoTrasMovimiento), 0)
          FROM WalletTransaccion t
         WHERE t.empresaId = :empresaId
        """)
    Long findUltimoSaldo(@Param("empresaId") Long empresaId);
}
