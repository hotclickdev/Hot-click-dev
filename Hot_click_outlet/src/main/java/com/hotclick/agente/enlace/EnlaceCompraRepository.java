package com.hotclick.agente.enlace;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

    /**
     * Vencen a las 24 h (venta perdida) los enlaces sin pagar: sin pedido, o con un pedido que no quedó pagado
     * (cancelado por TTL, rechazado, pendiente). Un pedido ya pagado lo resuelve la confirmación de pago (AG-08).
     */
    @Query("SELECT e.id FROM EnlaceCompra e WHERE e.estado IN ('CREADO','ABIERTO','RECHAZADO') AND e.vence <= :ahora "
        + "AND (e.pedidoId IS NULL OR e.pedidoId NOT IN (SELECT p.id FROM Pedido p WHERE p.estadoPedido IN "
        + "('PAGADO','EN_PREPARACION','LISTO_RETIRO','ENVIADO','ENTREGADO','COMPLETADO'))) ORDER BY e.id")
    List<Long> idsParaVencer(@Param("ahora") LocalDateTime ahora);

    /** Reserva de 30 min cumplida (o enlace ya terminal) que todavía tiene unidades sumadas en stock_reservado. */
    @Query("SELECT DISTINCT e.id FROM EnlaceCompra e JOIN e.items i WHERE i.cantidadReservada > 0 "
        + "AND (e.reservaHasta IS NULL OR e.reservaHasta <= :ahora OR e.estado NOT IN ('CREADO','ABIERTO','RECHAZADO')) ORDER BY e.id")
    List<Long> idsConReservaVencida(@Param("ahora") LocalDateTime ahora);

    /** AG-12 recordatorio 1: creado y sin abrir desde antes de {@code limite} (2 h), vigente y con conversación. */
    @Query("SELECT e FROM EnlaceCompra e WHERE e.estado = 'CREADO' AND e.abierto IS NULL AND e.recordatoriosEnviados = 0 "
        + "AND e.creado <= :limite AND e.vence > :ahora AND e.chatSesionId IS NOT NULL ORDER BY e.id")
    List<EnlaceCompra> paraRecordatorio1(@Param("limite") LocalDateTime limite, @Param("ahora") LocalDateTime ahora,
                                         Pageable pagina);

    /** AG-12 recordatorio 2: abierto desde antes de {@code limite} (30 min) sin pagar y sin recordatorio 2 previo. */
    @Query("SELECT e FROM EnlaceCompra e WHERE e.estado = 'ABIERTO' AND e.recordatorioCheckoutEn IS NULL "
        + "AND e.recordatoriosEnviados < 2 AND e.abierto <= :limite AND e.vence > :ahora "
        + "AND e.chatSesionId IS NOT NULL ORDER BY e.id")
    List<EnlaceCompra> paraRecordatorio2(@Param("limite") LocalDateTime limite, @Param("ahora") LocalDateTime ahora,
                                         Pageable pagina);

    /**
     * AG-14 H-04: enlaces vigentes sin pedido de una conversación o de un contacto de la tienda, del más viejo al más
     * nuevo. El contacto se compara con el valor guardado (ya recortado).
     */
    @Query("SELECT e.id FROM EnlaceCompra e WHERE e.estado IN ('CREADO','ABIERTO') AND e.pedidoId IS NULL "
        + "AND e.vence > :ahora AND (e.chatSesionId = :sesion OR (e.empresaId = :empresaId AND e.canal = :canal "
        + "AND e.contactoExterno = :contacto)) ORDER BY e.creado, e.id")
    List<Long> idsVigentesSinPedido(@Param("sesion") UUID sesion, @Param("empresaId") Long empresaId,
                                    @Param("canal") String canal, @Param("contacto") String contacto,
                                    @Param("ahora") LocalDateTime ahora);

    /** Igual que {@link #idsVigentesSinPedido} para la cuenta de HotClick (sin empresa). */
    @Query("SELECT e.id FROM EnlaceCompra e WHERE e.estado IN ('CREADO','ABIERTO') AND e.pedidoId IS NULL "
        + "AND e.vence > :ahora AND (e.chatSesionId = :sesion OR (e.empresaId IS NULL AND e.canal = :canal "
        + "AND e.contactoExterno = :contacto)) ORDER BY e.creado, e.id")
    List<Long> idsVigentesSinPedidoHotClick(@Param("sesion") UUID sesion, @Param("canal") String canal,
                                            @Param("contacto") String contacto, @Param("ahora") LocalDateTime ahora);
}
