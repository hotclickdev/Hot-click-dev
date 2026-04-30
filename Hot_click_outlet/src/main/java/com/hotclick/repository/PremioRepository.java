package com.hotclick.repository;

import com.hotclick.model.Premio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PremioRepository extends JpaRepository<Premio, Long> {

    List<Premio> findByActivoTrueAndEstado(Integer estado);

    List<Premio> findByAdminClienteIdAndEstado(Long adminId, Integer estado);
}
