package com.hotclick.repository;

import com.hotclick.model.AuditoriaAdmin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditoriaAdminRepository extends JpaRepository<AuditoriaAdmin, Long>, JpaSpecificationExecutor<AuditoriaAdmin> {

    Page<AuditoriaAdmin> findByEntidadOrderByFechaDesc(String entidad, Pageable pageable);

    Page<AuditoriaAdmin> findAllByOrderByFechaDesc(Pageable pageable);

    @Query("SELECT DISTINCT a.accion FROM AuditoriaAdmin a ORDER BY a.accion")
    List<String> findDistinctAcciones();
}
