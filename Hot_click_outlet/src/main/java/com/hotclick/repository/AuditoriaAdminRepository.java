package com.hotclick.repository;

import com.hotclick.model.AuditoriaAdmin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditoriaAdminRepository extends JpaRepository<AuditoriaAdmin, Long> {

    Page<AuditoriaAdmin> findByEntidadOrderByFechaDesc(String entidad, Pageable pageable);

    Page<AuditoriaAdmin> findAllByOrderByFechaDesc(Pageable pageable);
}
