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

    /** S4-23: [pedidoId, nombreProducto] de los ítems activos de varios pedidos del negocio, en orden de ítem. */
    @Query("""
        SELECT i.pedido.id, pr.nombreProducto FROM PedidoItem i
        JOIN i.producto pr
        WHERE i.pedido.id IN :pedidoIds AND i.pedido.empresa.id = :empresaId
          AND (i.estado IS NULL OR i.estado <> 3)
        ORDER BY i.id
        """)
    java.util.List<Object[]> nombresProductoPorPedido(@Param("pedidoIds") java.util.Collection<Long> pedidoIds,
                                                      @Param("empresaId") Long empresaId);
}
