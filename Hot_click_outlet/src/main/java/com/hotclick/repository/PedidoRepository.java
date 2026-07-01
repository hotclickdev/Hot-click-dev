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

    /** Detalle completo — evita LazyInitializationException al serializar empresa/usuarioFinal/bodega/items. */
    @Query("SELECT DISTINCT p FROM Pedido p " +
           "LEFT JOIN FETCH p.empresa " +
           "LEFT JOIN FETCH p.usuarioFinal " +
           "LEFT JOIN FETCH p.bodega " +
           "LEFT JOIN FETCH p.items " +
           "WHERE p.id = :id")
    Optional<Pedido> findByIdWithDetails(@Param("id") Long id);

    /** F29 CRM tenant check — verifica si un cliente tiene pedidos en una empresa específica. */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Pedido p WHERE p.usuarioFinal.id = :usuarioFinalId AND p.empresa.id = :empresaId")
    boolean existsByUsuarioFinalIdAndEmpresaId(@Param("usuarioFinalId") Long usuarioFinalId, @Param("empresaId") Long empresaId);

    Page<Pedido> findByUsuarioFinalIdOrderByFechaPedidoDesc(Long usuarioId, Pageable pageable);

    /** Con items precargados — evita N+1 al iterar items en listarPorUsuario. */
    @Query("SELECT DISTINCT p FROM Pedido p LEFT JOIN FETCH p.items WHERE p.usuarioFinal.id = :usuarioId ORDER BY p.fechaPedido DESC")
    List<Pedido> findByUsuarioFinalIdWithItems(@Param("usuarioId") Long usuarioId);

    /** Con items + usuarioFinal + bodega precargados — evita N+1 y LazyInitializationException al serializar en listarPendientes por empresa. */
    @Query("SELECT DISTINCT p FROM Pedido p LEFT JOIN FETCH p.items LEFT JOIN FETCH p.usuarioFinal LEFT JOIN FETCH p.bodega WHERE p.empresa.id = :empresaId AND p.estadoPedido = :estadoPedido AND p.estado = :estado")
    List<Pedido> findByEmpresaIdAndEstadoPedidoWithItems(@Param("empresaId") Long empresaId, @Param("estadoPedido") String estadoPedido, @Param("estado") Integer estado);

    /** Con items + usuarioFinal + bodega precargados — variante ADMIN (todas las empresas) de findByEmpresaIdAndEstadoPedidoWithItems. */
    @Query("SELECT DISTINCT p FROM Pedido p LEFT JOIN FETCH p.items LEFT JOIN FETCH p.usuarioFinal LEFT JOIN FETCH p.bodega WHERE p.estadoPedido = :estadoPedido AND p.estado = :estado")
    List<Pedido> findByEstadoPedidoAndEstado(@Param("estadoPedido") String estadoPedido, @Param("estado") Integer estado);

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

    /**
     * Reporte IVA — agregados financieros del período (ventas POS + e-commerce).
     * Orden de columnas: cantidadVentas, ventasTotales, subtotal, costoEnvio, cmv,
     * utilidadBruta, ivaConfirmado, ivaEstimado.
     */
    @Query(value =
        "SELECT COUNT(p.id_pedido), " +
        "COALESCE(SUM(p.total_pedido), 0), " +
        "COALESCE(SUM(p.subtotal), 0), " +
        "COALESCE(SUM(p.costo_envio), 0), " +
        "COALESCE(SUM(p.costo_total_productos), 0), " +
        "COALESCE(SUM(p.utilidad_bruta), 0), " +
        "COALESCE(SUM(CASE WHEN p.aplica_impuesto = true THEN p.monto_impuesto ELSE 0 END), 0), " +
        "COALESCE(SUM(ROUND(p.subtotal * 13.0 / 113.0)), 0) " +
        "FROM hot_click_pedido_tb p " +
        "WHERE p.fk_id_empresa = :empresaId " +
        "AND p.estado_pedido IN ('ENTREGADO','COMPLETADO') " +
        "AND (:desde IS NULL OR DATE(p.fecha_pedido) >= CAST(:desde AS date)) " +
        "AND (:hasta IS NULL OR DATE(p.fecha_pedido) <= CAST(:hasta AS date))",
        nativeQuery = true)
    List<Object[]> reporteIvaKpis(@Param("empresaId") Long empresaId,
                                 @Param("desde") String desde,
                                 @Param("hasta") String hasta);

    /**
     * Reporte IVA — detalle fila por fila para exportación a CSV (control contable).
     * Orden de columnas: fecha, documento, cliente, subtotal, iva, total, metodoPago, origen.
     */
    @Query(value =
        "SELECT DATE(p.fecha_pedido), " +
        "p.numero_pedido, " +
        "COALESCE(u.nombre, p.cliente_nombre, 'Consumidor Final'), " +
        "p.subtotal, " +
        "CASE WHEN p.aplica_impuesto = true THEN p.monto_impuesto ELSE ROUND(p.subtotal * 13.0 / 113.0) END, " +
        "p.total_pedido, " +
        "COALESCE(p.metodo_pago, '-'), " +
        "COALESCE(p.origen, 'ONLINE') " +
        "FROM hot_click_pedido_tb p " +
        "LEFT JOIN hot_click_usuario_tb u ON u.id_usuario = p.fk_id_usuario_final " +
        "WHERE p.fk_id_empresa = :empresaId " +
        "AND p.estado_pedido IN ('ENTREGADO','COMPLETADO') " +
        "AND (:desde IS NULL OR DATE(p.fecha_pedido) >= CAST(:desde AS date)) " +
        "AND (:hasta IS NULL OR DATE(p.fecha_pedido) <= CAST(:hasta AS date)) " +
        "ORDER BY p.fecha_pedido DESC",
        nativeQuery = true)
    List<Object[]> reporteIvaDetalle(@Param("empresaId") Long empresaId,
                                     @Param("desde") String desde,
                                     @Param("hasta") String hasta);
}
