package com.hotclick.repository;

import com.hotclick.model.Cotizacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CotizacionRepository extends JpaRepository<Cotizacion, Long> {

    // Legacy
    List<Cotizacion> findByEstadoOrderByFechaCotizacionDesc(Integer estado);

    // B2B — paginado con filtro opcional de estado
    @Query("""
        SELECT c FROM Cotizacion c
        LEFT JOIN FETCH c.cliente
        WHERE c.empresa.id = :empresaId
          AND c.estado = 1
          AND (:estadoCot IS NULL OR c.estadoCotizacion = :estadoCot)
        ORDER BY c.fechaCotizacion DESC
        """)
    List<Cotizacion> findB2BByEmpresa(
        @Param("empresaId") Long empresaId,
        @Param("estadoCot") String estadoCot
    );

    Page<Cotizacion> findByEmpresaIdAndEstadoOrderByFechaCotizacionDesc(
        Long empresaId, Integer estado, Pageable pageable
    );

    @Query("""
        SELECT c FROM Cotizacion c
        LEFT JOIN FETCH c.cliente
        LEFT JOIN FETCH c.items i
        LEFT JOIN FETCH i.producto
        WHERE c.id = :id AND c.empresa.id = :empresaId AND c.estado = 1
        """)
    Optional<Cotizacion> findByIdAndEmpresaId(@Param("id") Long id, @Param("empresaId") Long empresaId);

    @Query("""
        SELECT c FROM Cotizacion c
        LEFT JOIN FETCH c.cliente
        LEFT JOIN FETCH c.empresa
        LEFT JOIN FETCH c.items i
        LEFT JOIN FETCH i.producto
        WHERE c.tokenPublico = :token AND c.estado = 1
        """)
    Optional<Cotizacion> findByTokenPublico(@Param("token") UUID token);

    long countByEmpresaIdAndEstadoAndEstadoCotizacion(Long empresaId, Integer estado, String estadoCotizacion);
}
