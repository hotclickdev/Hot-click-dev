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

    @Query("""
        SELECT a FROM AuditoriaAdmin a
        WHERE (:accion IS NULL OR a.accion = :accion)
          AND (:adminEmail IS NULL OR LOWER(a.adminEmail) LIKE LOWER(CONCAT('%', :adminEmail, '%')))
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
