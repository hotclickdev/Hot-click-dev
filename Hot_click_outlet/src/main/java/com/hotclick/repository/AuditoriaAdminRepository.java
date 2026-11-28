package com.hotclick.repository;

import com.hotclick.model.AuditoriaAdmin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditoriaAdminRepository extends JpaRepository<AuditoriaAdmin, Long> {

    Page<AuditoriaAdmin> findByEntidadOrderByFechaDesc(String entidad, Pageable pageable);

    Page<AuditoriaAdmin> findAllByOrderByFechaDesc(Pageable pageable);

    /**
     * Los filtros de texto van con {@code CAST(... AS String)}: con un null sin tipo, PostgreSQL lo toma como
     * {@code bytea} y falla con {@code function lower(bytea) does not exist} (el panel manda null en cada carga).
     */
    @Query("""
        SELECT a FROM AuditoriaAdmin a
        WHERE (CAST(:accion AS String) IS NULL OR a.accion = CAST(:accion AS String))
          AND (CAST(:adminEmail AS String) IS NULL
               OR LOWER(a.adminEmail) LIKE LOWER(CONCAT('%', CAST(:adminEmail AS String), '%')))
          AND (:empresaId IS NULL OR a.empresaId = :empresaId)
          AND a.fecha >= :desde
          AND a.fecha <= :hasta
        ORDER BY a.fecha DESC
        """)
    Page<AuditoriaAdmin> buscar(
            @Param("accion") String accion,
            @Param("adminEmail") String adminEmail,
            @Param("empresaId") Long empresaId,
            @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta,
            Pageable pageable);

    @Query("SELECT DISTINCT a.accion FROM AuditoriaAdmin a ORDER BY a.accion")
    List<String> findDistinctAcciones();
}
