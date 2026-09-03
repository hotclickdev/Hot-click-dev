package com.hotclick.repository;

import com.hotclick.model.MetodoCobro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MetodoCobroRepository extends JpaRepository<MetodoCobro, Long> {

    @Query("""
        SELECT m FROM MetodoCobro m
        WHERE m.empresa.id = :empresaId AND m.activo = true
        ORDER BY m.predeterminado DESC, m.fechaCreacion DESC
        """)
    List<MetodoCobro> findActivosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("""
        SELECT m FROM MetodoCobro m
        JOIN FETCH m.empresa
        WHERE m.id = :id AND m.activo = true
        """)
    Optional<MetodoCobro> findActivoById(@Param("id") Long id);

    long countByEmpresa_IdAndActivoTrue(Long empresaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE MetodoCobro m
        SET m.predeterminado = false
        WHERE m.empresa.id = :empresaId AND m.activo = true AND m.predeterminado = true
        """)
    void clearPredeterminado(@Param("empresaId") Long empresaId);
}
