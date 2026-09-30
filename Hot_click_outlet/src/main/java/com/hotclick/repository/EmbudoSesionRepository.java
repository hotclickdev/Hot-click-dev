package com.hotclick.repository;

import com.hotclick.model.EmbudoSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmbudoSesionRepository extends JpaRepository<EmbudoSesion, Long> {

    Optional<EmbudoSesion> findBySessionKey(String sessionKey);

    @Query("""
        SELECT e.paso, COUNT(e) FROM EmbudoSesion e
        WHERE e.actualizadoEn >= :desde
        GROUP BY e.paso
        """)
    List<Object[]> contarPorPasoDesde(@Param("desde") LocalDateTime desde);

    @Query("""
        SELECT e.motivo, COUNT(e) FROM EmbudoSesion e
        WHERE e.actualizadoEn >= :desde AND e.motivo IS NOT NULL
        GROUP BY e.motivo
        """)
    List<Object[]> contarMotivosDesde(@Param("desde") LocalDateTime desde);
}
