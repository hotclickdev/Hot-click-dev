package com.hotclick.agente.enlace;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EnlaceCompraRepository extends JpaRepository<EnlaceCompra, Long> {

    Optional<EnlaceCompra> findByCodigo(String codigo);

    /** Bloquea la fila: dos aperturas simultáneas no pueden sumar dos veces la misma reserva. Orden de locks: enlace y luego productos. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EnlaceCompra e WHERE e.codigo = :codigo")
    Optional<EnlaceCompra> findByCodigoForUpdate(@Param("codigo") String codigo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EnlaceCompra e WHERE e.id = :id")
    Optional<EnlaceCompra> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EnlaceCompra e WHERE e.pedidoId = :pedidoId")
    List<EnlaceCompra> findByPedidoIdForUpdate(@Param("pedidoId") Long pedidoId);

    /** Vencen a las 24 h solo los que aún no tienen pedido: con pedido en curso decide la confirmación de pago (AG-08). */
    @Query("SELECT e.id FROM EnlaceCompra e WHERE e.estado IN ('CREADO','ABIERTO') AND e.vence <= :ahora AND e.pedidoId IS NULL ORDER BY e.id")
    List<Long> idsParaVencer(@Param("ahora") LocalDateTime ahora);

    /** Reserva de 30 min cumplida (o enlace ya terminal) que todavía tiene unidades sumadas en stock_reservado. */
    @Query("SELECT DISTINCT e.id FROM EnlaceCompra e JOIN e.items i WHERE i.cantidadReservada > 0 "
        + "AND (e.reservaHasta IS NULL OR e.reservaHasta <= :ahora OR e.estado NOT IN ('CREADO','ABIERTO','RECHAZADO')) ORDER BY e.id")
    List<Long> idsConReservaVencida(@Param("ahora") LocalDateTime ahora);
}
