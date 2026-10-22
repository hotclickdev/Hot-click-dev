package com.hotclick.repository;

import com.hotclick.model.MovimientoStock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimientoStockRepository extends JpaRepository<MovimientoStock, Long> {

    List<MovimientoStock> findByProductoIdOrderByFechaMovimientoDesc(Long productoId);

    Page<MovimientoStock> findByProductoIdOrderByFechaMovimientoDesc(Long productoId, Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT DISTINCT m.producto.id FROM MovimientoStock m WHERE m.tipoMovimiento = :tipo AND m.referencia = :referencia")
    java.util.Set<Long> productoIdsPorTipoYReferencia(
        @org.springframework.data.repository.query.Param("tipo") String tipo,
        @org.springframework.data.repository.query.Param("referencia") String referencia);

    List<MovimientoStock> findByTipoMovimientoOrderByFechaMovimientoDesc(String tipoMovimiento);
}
