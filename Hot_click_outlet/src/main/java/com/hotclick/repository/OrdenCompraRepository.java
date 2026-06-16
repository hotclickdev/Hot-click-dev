package com.hotclick.repository;

import com.hotclick.model.OrdenCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface OrdenCompraRepository extends JpaRepository<OrdenCompra, Long> {

    @Query("SELECT o FROM OrdenCompra o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.producto " +
           "LEFT JOIN FETCH o.proveedor LEFT JOIN FETCH o.usuario " +
           "WHERE o.empresa.id = :empresaId ORDER BY o.fechaOrden DESC")
    List<OrdenCompra> findByEmpresaIdConDetalles(@Param("empresaId") Long empresaId);

    @Query("SELECT o FROM OrdenCompra o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.producto " +
           "LEFT JOIN FETCH o.proveedor LEFT JOIN FETCH o.usuario WHERE o.id = :id")
    Optional<OrdenCompra> findByIdConDetalles(@Param("id") Long id);

    /** Total de compras a proveedor RECIBIDAS en el período — para contraste de COGS en reportes. */
    @Query(value =
        "SELECT COALESCE(SUM(oc.total), 0) " +
        "FROM hot_click_orden_compra_tb oc " +
        "WHERE oc.fk_id_empresa = :empresaId " +
        "AND oc.estado = 'RECIBIDA' " +
        "AND (:desde IS NULL OR DATE(oc.fecha_recepcion) >= CAST(:desde AS date)) " +
        "AND (:hasta IS NULL OR DATE(oc.fecha_recepcion) <= CAST(:hasta AS date))",
        nativeQuery = true)
    long sumComprasRecibidasEnPeriodo(@Param("empresaId") Long empresaId,
                                      @Param("desde") String desde,
                                      @Param("hasta") String hasta);
}
