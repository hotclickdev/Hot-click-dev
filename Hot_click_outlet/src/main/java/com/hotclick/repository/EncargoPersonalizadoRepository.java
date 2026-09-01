package com.hotclick.repository;

import com.hotclick.model.EncargoPersonalizado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EncargoPersonalizadoRepository extends JpaRepository<EncargoPersonalizado, Long> {

    Optional<EncargoPersonalizado> findByTokenPublico(String tokenPublico);

    @Query("""
        SELECT e FROM EncargoPersonalizado e
        LEFT JOIN FETCH e.producto
        WHERE e.empresa.id = :empresaId
        ORDER BY e.fechaCreacion DESC
        """)
    List<EncargoPersonalizado> findByEmpresaIdConProducto(@Param("empresaId") Long empresaId);

    @Query("""
        SELECT e FROM EncargoPersonalizado e
        LEFT JOIN FETCH e.producto
        WHERE e.empresa.id = :empresaId AND e.estado = :estado
        ORDER BY e.fechaCreacion DESC
        """)
    List<EncargoPersonalizado> findByEmpresaIdAndEstadoConProducto(
        @Param("empresaId") Long empresaId,
        @Param("estado") String estado);

    List<EncargoPersonalizado> findByPedido_Id(Long pedidoId);

    @Query("""
        SELECT e FROM EncargoPersonalizado e
        WHERE e.estado = 'APROBADO'
          AND e.fechaVencimiento IS NOT NULL
          AND e.fechaVencimiento < :ahora
        """)
    List<EncargoPersonalizado> findAprobadosVencidos(@Param("ahora") LocalDateTime ahora);

    @Query("""
        SELECT COUNT(e) FROM EncargoPersonalizado e
        WHERE e.empresa.id = :empresaId AND e.estado = :estado
        """)
    long countByEmpresaIdAndEstado(@Param("empresaId") Long empresaId, @Param("estado") String estado);

    @Query("""
        SELECT COALESCE(AVG(e.precioCotizado), 0) FROM EncargoPersonalizado e
        WHERE e.empresa.id = :empresaId AND e.precioCotizado IS NOT NULL AND e.precioCotizado > 0
        """)
    Double promedioPrecioCotizado(@Param("empresaId") Long empresaId);
}
