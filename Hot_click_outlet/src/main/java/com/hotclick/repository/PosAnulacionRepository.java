package com.hotclick.repository;

import com.hotclick.model.PosAnulacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PosAnulacionRepository extends JpaRepository<PosAnulacion, Long> {
    List<PosAnulacion> findByEmpresaIdOrderByFechaDesc(Long empresaId);
}
