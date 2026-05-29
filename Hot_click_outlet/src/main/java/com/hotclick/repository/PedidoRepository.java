package com.hotclick.repository;

import com.hotclick.model.Pedido;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    Optional<Pedido> findByNumeroPedido(String numeroPedido);

    Page<Pedido> findByUsuarioFinalIdOrderByFechaPedidoDesc(Long usuarioId, Pageable pageable);

    List<Pedido> findByEstadoPedidoAndEstado(String estadoPedido, Integer estado);

    Long countByEstadoPedidoAndEstado(String estadoPedido, Integer estado);

    @Query("SELECT COUNT(p) FROM Pedido p")
    long countTotalPedidos();

    @Query("SELECT COALESCE(SUM(p.totalPedido), 0) FROM Pedido p")
    long sumTotalVentas();

    @Query("SELECT DISTINCT p FROM Pedido p " +
           "LEFT JOIN FETCH p.usuarioFinal " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.producto pr " +
           "LEFT JOIN FETCH pr.categoria " +
           "ORDER BY p.fechaPedido DESC")
    List<Pedido> findAllWithDetails();

    /** Paginated header-only — para AdminReportes (sin items, evita in-memory full table scan) */
    Page<Pedido> findAllByOrderByFechaPedidoDesc(Pageable pageable);

    @Query("SELECT DISTINCT p FROM Pedido p " +
           "LEFT JOIN FETCH p.usuarioFinal " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.producto pr " +
           "LEFT JOIN FETCH pr.categoria " +
           "WHERE p.empresa.id = :empresaId " +
           "ORDER BY p.fechaPedido DESC")
    List<Pedido> findAllWithDetailsByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT p FROM Pedido p WHERE p.empresa.id = :empresaId AND p.estadoPedido = :estadoPedido AND p.estado = :estado")
    List<Pedido> findByEmpresaIdAndEstadoPedidoAndEstado(@Param("empresaId") Long empresaId, @Param("estadoPedido") String estadoPedido, @Param("estado") Integer estado);

    @Query("SELECT COUNT(p) FROM Pedido p WHERE p.empresa.id = :empresaId")
    long countTotalPedidosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT COALESCE(SUM(p.totalPedido), 0) FROM Pedido p WHERE p.empresa.id = :empresaId")
    long sumTotalVentasByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT DISTINCT p FROM Pedido p " +
           "LEFT JOIN FETCH p.usuarioFinal " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.producto pr " +
           "WHERE p.empresa.id = :empresaId " +
           "ORDER BY p.fechaPedido DESC")
    List<Pedido> findUltimosByEmpresaId(@Param("empresaId") Long empresaId, Pageable pageable);

    @Query("SELECT DISTINCT p FROM Pedido p " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.producto pr " +
           "WHERE p.usuarioFinal.id = :usuarioId AND p.estadoPedido = 'ENTREGADO'")
    List<Pedido> findEntregadosConItemsByUsuarioId(@Param("usuarioId") Long usuarioId);
}
