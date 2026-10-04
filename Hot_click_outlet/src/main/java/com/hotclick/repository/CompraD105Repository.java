package com.hotclick.repository;

import com.hotclick.model.CompraD105;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CompraD105Repository extends JpaRepository<CompraD105, Long> {

    boolean existsByClaveNumerica(String claveNumerica);

    @Query("""
        SELECT COALESCE(SUM(c.subtotalNeto), 0)
        FROM CompraD105 c
        WHERE c.anio = :anio AND c.trimestre = :trimestre
        """)
    long sumarSubtotalNeto(@Param("anio") int anio, @Param("trimestre") String trimestre);

    long countByAnioAndTrimestre(int anio, String trimestre);
}
