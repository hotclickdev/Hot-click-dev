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

    /** F29 CRM tenant check — verifica si un cliente tiene pedidos en una empresa específica. */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Pedido p WHERE p.usuarioFinal.id = :usuarioFinalId AND p.empresa.id = :empresaId")
    boolean existsByUsuarioFinalIdAndEmpresaId(@Param("usuarioFinalId") Long usuarioFinalId, @Param("empresaId") Long empresaId);

    Page<Pedido> findByUsuarioFinalIdOrderByFechaPedidoDesc(Long usuarioId, Pageable pageable);

    /** Con items precargados — evita N+1 al iterar items en listarPorUsuario. */
    @Query("SELECT DISTINCT p FROM Pedido p LEFT JOIN FETCH p.items WHERE p.usuarioFinal.id = :usuarioId ORDER BY p.fechaPedido DESC")
    List<Pedido> findByUsuarioFinalIdWithItems(@Param("usuarioId") Long usuarioId);

    /** Con items precargados — evita N+1 en listarPendientes por empresa. */
    @Query("SELECT DISTINCT p FROM Pedido p LEFT JOIN FETCH p.items WHERE p.empresa.id = :empresaId AND p.estadoPedido = :estadoPedido AND p.estado = :estado")
    List<Pedido> findByEmpresaIdAndEstadoPedidoWithItems(@Param("empresaId") Long empresaId, @Param("estadoPedido") String estadoPedido, @Param("estado") Integer estado);

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

    /** Ídem pero filtrado por empresa — para EMPRENDEDOR */
    @Query("SELECT p FROM Pedido p WHERE p.empresa.id = :empresaId ORDER BY p.fechaPedido DESC")
    Page<Pedido> findByEmpresaIdOrderByFechaPedidoDesc(@Param("empresaId") Long empresaId, Pageable pageable);

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

    /** F30 — COUNT sin cargar entidades (reemplaza .size() en DashboardService). */
    @Query("SELECT COUNT(p) FROM Pedido p WHERE p.empresa.id = :empresaId AND p.estadoPedido = :estadoPedido AND p.estado = :estado")
    long countByEmpresaIdAndEstadoPedidoAndEstado(@Param("empresaId") Long empresaId, @Param("estadoPedido") String estadoPedido, @Param("estado") Integer estado);

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

    @Query("SELECT DISTINCT p FROM Pedido p " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.producto pr " +
           "LEFT JOIN FETCH p.usuarioFinal " +
           "WHERE p.empresa.id = :empresaId AND p.estadoPedido = 'ENTREGADO'")
    List<Pedido> findEntregadosConItemsByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT p FROM Pedido p LEFT JOIN FETCH p.items i LEFT JOIN FETCH i.producto " +
           "WHERE p.empresa.id = :empresaId AND p.origen = :origen " +
           "ORDER BY p.fechaPedido DESC")
    List<Pedido> findByEmpresaIdAndOrigenOrderByFechaPedidoDesc(
            @Param("empresaId") Long empresaId, @Param("origen") String origen);

    @Query(value = "SELECT COUNT(p.id_pedido), COALESCE(SUM(p.total_pedido), 0) " +
                   "FROM hot_click_pedido_tb p " +
                   "WHERE p.fk_id_usuario_final = :userId " +
                   "AND p.estado_pedido IN ('ENTREGADO','COMPLETADO')",
           nativeQuery = true)
    List<Object[]> statsPorUsuario(@Param("userId") Long userId);
}
