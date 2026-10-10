package com.hotclick.repository;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** Consultas de solo lectura del CRM admin (fase 0–1). Sin costos ni márgenes. */
public interface CrmPedidoRepository extends Repository<Pedido, Long> {

    @Query(value = """
        SELECT p FROM Pedido p
        LEFT JOIN FETCH p.usuarioFinal
        LEFT JOIN FETCH p.empresa
        WHERE (:empresaId IS NULL OR p.empresa.id = :empresaId)
          AND (:compradorId IS NULL OR p.usuarioFinal.id = :compradorId)
        ORDER BY p.fechaPedido DESC, p.id DESC
        """,
        countQuery = """
        SELECT COUNT(p) FROM Pedido p
        WHERE (:empresaId IS NULL OR p.empresa.id = :empresaId)
          AND (:compradorId IS NULL OR p.usuarioFinal.id = :compradorId)
        """)
    Page<Pedido> buscar(@Param("empresaId") Long empresaId,
                        @Param("compradorId") Long compradorId,
                        Pageable pageable);

    @Query("SELECT i FROM PedidoItem i JOIN FETCH i.producto WHERE i.pedido.id IN :ids ORDER BY i.id")
    List<PedidoItem> itemsDe(@Param("ids") Collection<Long> ids);

    /** [cantidad pedidos, suma total de pedidos pagados, primera fecha, última fecha]. */
    @Query("""
        SELECT COUNT(p),
               COALESCE(SUM(CASE WHEN p.estadoPedido IN :pagados THEN p.totalPedido ELSE 0 END), 0),
               MIN(p.fechaPedido), MAX(p.fechaPedido),
               COALESCE(SUM(CASE WHEN p.estadoPedido IN :pagados THEN 1 ELSE 0 END), 0)
        FROM Pedido p WHERE p.usuarioFinal.id = :id
        """)
    List<Object[]> resumenComprador(@Param("id") Long compradorId, @Param("pagados") Collection<String> pagados);

    @Query("""
        SELECT COUNT(p),
               COALESCE(SUM(CASE WHEN p.estadoPedido IN :pagados THEN p.totalPedido ELSE 0 END), 0),
               MIN(p.fechaPedido), MAX(p.fechaPedido),
               COALESCE(SUM(CASE WHEN p.estadoPedido IN :pagados THEN 1 ELSE 0 END), 0)
        FROM Pedido p WHERE p.empresa.id = :id
        """)
    List<Object[]> resumenNegocio(@Param("id") Long empresaId, @Param("pagados") Collection<String> pagados);

    @Query("SELECT COUNT(DISTINCT p.usuarioFinal.id) FROM Pedido p WHERE p.empresa.id = :id")
    long compradoresDistintosDeNegocio(@Param("id") Long empresaId);

    /** QA-131-3: por negocio, [empresaId, total pagado, total pendiente de cobro] con los montos guardados en cada pedido. */
    @Query("""
        SELECT p.empresa.id,
               COALESCE(SUM(CASE WHEN p.estadoPedido IN :pagados THEN p.totalPedido ELSE 0 END), 0),
               COALESCE(SUM(CASE WHEN p.estadoPedido IN :pendientes THEN p.totalPedido ELSE 0 END), 0)
        FROM Pedido p WHERE p.empresa IS NOT NULL GROUP BY p.empresa.id
        """)
    List<Object[]> pagadoYPendientePorEmpresa(@Param("pagados") Collection<String> pagados,
                                              @Param("pendientes") Collection<String> pendientes);
}
