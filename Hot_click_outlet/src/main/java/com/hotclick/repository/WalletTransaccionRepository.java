package com.hotclick.repository;

import com.hotclick.model.WalletTransaccion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface WalletTransaccionRepository extends JpaRepository<WalletTransaccion, Long> {

    Page<WalletTransaccion> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId, Pageable pageable);

    boolean existsByReferenciaTipoAndReferenciaId(String referenciaTipo, Long referenciaId);

    boolean existsByReferenciaTipoAndReferenciaIdAndTipo(String referenciaTipo, Long referenciaId, String tipo);

    /** Último saldo registrado en el ledger para calcular saldo_tras_movimiento. */
    @Query("""
        SELECT COALESCE(MAX(t.saldoTrasMovimiento), 0)
          FROM WalletTransaccion t
         WHERE t.empresaId = :empresaId
        """)
    Long findUltimoSaldo(@Param("empresaId") Long empresaId);

    /** Movimientos aún no cubiertos por ninguna liquidación, anteriores a {@code hasta}. V169. */
    @Query("""
        SELECT t FROM WalletTransaccion t
         WHERE t.empresaId = :empresaId
           AND t.payoutLiquidacionId IS NULL
           AND t.tipo IN :tipos
           AND t.fechaCreacion < :hasta
         ORDER BY t.fechaCreacion ASC
        """)
    List<WalletTransaccion> findSinLiquidar(@Param("empresaId") Long empresaId,
                                            @Param("tipos") Collection<String> tipos,
                                            @Param("hasta") LocalDateTime hasta);

    @Query("""
        SELECT DISTINCT t.empresaId FROM WalletTransaccion t
         WHERE t.payoutLiquidacionId IS NULL
           AND t.tipo = 'CREDITO_VENTA'
           AND t.fechaCreacion < :hasta
        """)
    List<Long> findEmpresasConCreditosSinLiquidar(@Param("hasta") LocalDateTime hasta);

    /** De los pedidos dados, cuáles se cobraron contra entrega (metodoPago EFECTIVO). */
    @Query("SELECT p.id FROM Pedido p WHERE p.id IN :ids AND UPPER(p.metodoPago) = 'EFECTIVO'")
    List<Long> findPedidosContraEntrega(@Param("ids") Collection<Long> ids);

    /** Payout rechazado: sus movimientos vuelven a quedar sin liquidar para la próxima corrida. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE WalletTransaccion t SET t.payoutLiquidacionId = NULL WHERE t.payoutLiquidacionId = :payoutId AND t.tipo <> 'RETENCION_PAYOUT'")
    int liberarLiquidacion(@Param("payoutId") Long payoutId);
}
