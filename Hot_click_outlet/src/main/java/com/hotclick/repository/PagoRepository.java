package com.hotclick.repository;

import com.hotclick.model.Pago;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {

    Optional<Pago> findByMerchantToken(String merchantToken);

    /** Serializa confirmación y webhook del mismo cobro. El lock dura la transacción. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pago p WHERE p.merchantToken = :merchantToken")
    Optional<Pago> findByMerchantTokenForUpdate(@Param("merchantToken") String merchantToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoIdForUpdate(@Param("pedidoId") Long pedidoId);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId AND p.usuario.id = :usuarioId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoIdAndUsuarioId(Long pedidoId, Long usuarioId);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoId(Long pedidoId);

    @Query("SELECT p FROM Pago p WHERE p.estadoPago = 'PENDIENTE' AND p.fechaCreacion < :corte")
    List<Pago> findExpiradosPendientes(LocalDateTime corte);

    /**
     * Scheduler-safe: filtra por empresa. Excluye SINPE (confirmación manual;
     * no debe cancelarse por TTL aunque el pedido ya tenga empresa).
     */
    @Query("SELECT p FROM Pago p WHERE p.estadoPago = 'PENDIENTE' AND p.fechaCreacion < :corte "
        + "AND p.pedido.empresa.id = :empresaId AND (p.proveedor IS NULL OR p.proveedor <> 'SINPE')")
    List<Pago> findExpiradosPendientesByEmpresa(@Param("corte") LocalDateTime corte, @Param("empresaId") Long empresaId);

    @Query("SELECT p FROM Pago p WHERE (:proveedor IS NULL OR p.proveedor = :proveedor) AND (:estadoPago IS NULL OR p.estadoPago = :estadoPago) ORDER BY p.fechaCreacion DESC")
    Page<Pago> buscarPagos(@Param("proveedor") String proveedor, @Param("estadoPago") String estadoPago, Pageable pageable);

    @Query(
        value = "SELECT p FROM Pago p JOIN FETCH p.pedido ped JOIN FETCH p.usuario "
            + "WHERE (:proveedor IS NULL OR p.proveedor = :proveedor) "
            + "AND (:estadoPago IS NULL OR p.estadoPago = :estadoPago) "
            + "AND (:empresaId IS NULL OR ped.empresa.id = :empresaId) "
            + "ORDER BY p.fechaCreacion DESC",
        countQuery = "SELECT COUNT(p) FROM Pago p "
            + "WHERE (:proveedor IS NULL OR p.proveedor = :proveedor) "
            + "AND (:estadoPago IS NULL OR p.estadoPago = :estadoPago) "
            + "AND (:empresaId IS NULL OR p.pedido.empresa.id = :empresaId)")
    Page<Pago> buscarPagosByEmpresa(@Param("proveedor") String proveedor, @Param("estadoPago") String estadoPago, @Param("empresaId") Long empresaId, Pageable pageable);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.estadoPago = :estadoPago")
    long countByEstadoPago(@Param("estadoPago") String estadoPago);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.estadoPago = :estadoPago AND (:empresaId IS NULL OR p.pedido.empresa.id = :empresaId)")
    long countByEstadoPagoAndEmpresa(@Param("estadoPago") String estadoPago, @Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.proveedor = :proveedor")
    long countByProveedor(@Param("proveedor") String proveedor);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.proveedor = :proveedor AND (:empresaId IS NULL OR p.pedido.empresa.id = :empresaId)")
    long countByProveedorAndEmpresa(@Param("proveedor") String proveedor, @Param("empresaId") Long empresaId);

    // ── Regla anti-bot de reservas (QA-CONC-4) ───────────────────────────────

    @Query("SELECT p.id FROM Pago p WHERE p.id IN :ids AND p.estadoPago = 'PENDIENTE'")
    List<Long> findIdsPendientesIn(@Param("ids") java.util.Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pago p WHERE p.id = :id")
    Optional<Pago> findByIdForUpdate(@Param("id") Long id);

    /**
     * Pagos pendientes con la marca anti-bot vencida: {@code fechaExpiracion} pasada y creados
     * hace poco. Los SINPE normales (24 h o sin expiración) quedan fuera por {@code desde}; un
     * pago de tarjeta sin marca vence a creación + 30 min y para entonces ya lo canceló
     * {@link #findExpiradosPendientesByEmpresa} en la misma corrida. Orden por id = orden de lock estable.
     */
    @Query("SELECT p.id FROM Pago p WHERE p.estadoPago = 'PENDIENTE' AND p.fechaExpiracion < :ahora "
        + "AND p.fechaCreacion > :desde AND p.pedido.empresa.id = :empresaId ORDER BY p.id")
    List<Long> findIdsReservaMarcadaVencidaByEmpresa(@Param("ahora") LocalDateTime ahora,
                                                     @Param("desde") LocalDateTime desde,
                                                     @Param("empresaId") Long empresaId);
}
