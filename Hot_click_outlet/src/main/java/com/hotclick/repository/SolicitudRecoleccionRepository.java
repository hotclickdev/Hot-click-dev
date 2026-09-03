package com.hotclick.repository;

import com.hotclick.model.SolicitudRecoleccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SolicitudRecoleccionRepository extends JpaRepository<SolicitudRecoleccion, Long> {

    @Query("""
        SELECT s FROM SolicitudRecoleccion s
        LEFT JOIN FETCH s.empresa
        WHERE s.empresa.id = :empresaId
        ORDER BY s.fechaCreacion DESC
        """)
    List<SolicitudRecoleccion> findByEmpresaIdConEmpresa(@Param("empresaId") Long empresaId);

    @Query("""
        SELECT s FROM SolicitudRecoleccion s
        LEFT JOIN FETCH s.empresa
        ORDER BY s.fechaCreacion DESC
        """)
    List<SolicitudRecoleccion> findAllConEmpresa();

    @Query("""
        SELECT s FROM SolicitudRecoleccion s
        LEFT JOIN FETCH s.empresa
        WHERE s.id = :id
        """)
    Optional<SolicitudRecoleccion> findByIdConEmpresa(@Param("id") Long id);

    long countByEstado(String estado);
}
