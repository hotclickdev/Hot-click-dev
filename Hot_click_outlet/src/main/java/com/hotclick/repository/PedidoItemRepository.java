package com.hotclick.repository;

import com.hotclick.model.PedidoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PedidoItemRepository extends JpaRepository<PedidoItem, Long> {

    @Query("""
        SELECT i FROM PedidoItem i
        JOIN FETCH i.pedido p
        JOIN FETCH p.empresa
        JOIN FETCH i.producto
        WHERE i.id = :id
        """)
    Optional<PedidoItem> findParaConsola(@Param("id") Long id);

    long countBySinInventarioTrue();
}
