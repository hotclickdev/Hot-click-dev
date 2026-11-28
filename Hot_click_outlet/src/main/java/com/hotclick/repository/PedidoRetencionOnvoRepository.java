package com.hotclick.repository;

import com.hotclick.model.PedidoRetencionOnvo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PedidoRetencionOnvoRepository extends JpaRepository<PedidoRetencionOnvo, Long> {
    Optional<PedidoRetencionOnvo> findByPedidoId(Long pedidoId);

    @Modifying
    @Transactional
    @Query("delete from PedidoRetencionOnvo r where r.pedidoId = :pedidoId")
    int borrarPorPedido(@Param("pedidoId") Long pedidoId);
}
