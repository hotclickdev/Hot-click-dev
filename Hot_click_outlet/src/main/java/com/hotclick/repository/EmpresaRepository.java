package com.hotclick.repository;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    Optional<Empresa> findBySlug(String slug);

    @Query("SELECT e FROM Empresa e LEFT JOIN FETCH e.plan WHERE e.id = :id")
    Optional<Empresa> findByIdWithPlan(@Param("id") Long id);

    @Query("SELECT e FROM Empresa e LEFT JOIN FETCH e.plan ORDER BY e.fechaRegistro DESC")
    List<Empresa> findAllWithPlanOrderByFechaRegistroDesc();

    Optional<Empresa> findByCorreoEmpresa(String correoEmpresa);

    boolean existsBySlug(String slug);

    boolean existsByCorreoEmpresa(String correoEmpresa);

    long countByEstadoEmpresa(String estadoEmpresa);

    List<Empresa> findByEstadoEmpresaOrderByFechaRegistroDesc(String estadoEmpresa);

    List<Empresa> findByEstadoEmpresaOrderByFechaRegistroAsc(String estadoEmpresa);

    List<Empresa> findAllByOrderByFechaRegistroDesc();

    Optional<Empresa> findFirstByEstadoEmpresaOrderByIdAsc(String estadoEmpresa);

    // Cursor-based paging para schedulers — carga solo IDs, no entidades completas.
    // Evita OOM al iterar miles de tenants: cada página libera la anterior del heap.
    @Query("SELECT e.id FROM Empresa e WHERE e.estadoEmpresa = :estado AND e.id > :cursor ORDER BY e.id ASC")
    List<Long> findIdsByEstadoAfterCursor(@Param("estado") String estado,
                                          @Param("cursor") Long cursor,
                                          Pageable pageable);

    /** Batch UPDATE: degrada plan y estado de múltiples empresas en un solo statement. */
    @Modifying
    @Transactional
    @Query("UPDATE Empresa e SET e.plan = :freePlan, e.estadoPlan = 'VENCIDO', e.fechaVencPlan = :hoy WHERE e.id IN :ids")
    int degradarPlanBatch(@Param("ids") List<Long> ids,
                          @Param("freePlan") Plan freePlan,
                          @Param("hoy") LocalDate hoy);
}
