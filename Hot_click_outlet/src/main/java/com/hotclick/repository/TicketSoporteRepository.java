package com.hotclick.repository;

import com.hotclick.model.TicketSoporte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketSoporteRepository extends JpaRepository<TicketSoporte, Long> {

    List<TicketSoporte> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId);

    @Query("""
        SELECT t FROM TicketSoporte t
        LEFT JOIN FETCH t.empresa
        LEFT JOIN FETCH t.usuario
        LEFT JOIN FETCH t.asignado
        WHERE (:empresaId IS NULL OR t.empresa.id = :empresaId)
          AND (:estado IS NULL OR t.estado = :estado)
        ORDER BY
          CASE t.prioridad WHEN 'ALTA' THEN 0 WHEN 'MEDIA' THEN 1 WHEN 'BAJA' THEN 2 ELSE 3 END,
          t.fechaCreacion ASC
        """)
    List<TicketSoporte> findAdminFiltrado(
        @Param("empresaId") Long empresaId,
        @Param("estado") String estado);
}
