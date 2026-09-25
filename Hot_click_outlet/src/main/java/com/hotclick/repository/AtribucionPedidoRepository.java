package com.hotclick.repository;

import com.hotclick.model.AtribucionPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AtribucionPedidoRepository extends JpaRepository<AtribucionPedido, Long> {

    Optional<AtribucionPedido> findByPedidoId(Long pedidoId);

    @Query("""
        SELECT a FROM AtribucionPedido a
        JOIN FETCH a.pedido p
        LEFT JOIN FETCH p.usuarioFinal
        WHERE p.estadoPedido NOT IN ('PENDIENTE', 'PENDIENTE_COMPROBANTE', 'PENDIENTE_APROBACION', 'CANCELADO')
          AND p.fechaPedido >= :desde AND p.fechaPedido < :hasta
          AND (:empresaId IS NULL OR a.empresa.id = :empresaId)
        """)
    List<AtribucionPedido> findPagadosEnPeriodo(
        @Param("empresaId") Long empresaId,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta);
}
