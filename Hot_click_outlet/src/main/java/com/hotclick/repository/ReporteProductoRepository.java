package com.hotclick.repository;

import com.hotclick.model.ReporteProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReporteProductoRepository extends JpaRepository<ReporteProducto, Long> {

    long countByEstado(String estado);

    @Query("""
        SELECT r FROM ReporteProducto r
        LEFT JOIN FETCH r.producto p
        LEFT JOIN FETCH r.usuario
        WHERE r.estado = :estado
        ORDER BY r.fechaCreacion DESC
        """)
    List<ReporteProducto> findByEstadoConProducto(@Param("estado") String estado);
}
