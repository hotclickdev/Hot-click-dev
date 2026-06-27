package com.hotclick.repository;

import com.hotclick.model.Convenio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConvenioRepository extends JpaRepository<Convenio, Long> {
    List<Convenio> findByActivoTrueAndEstadoOrderByNombreAsc(Integer estado);
    List<Convenio> findAllByOrderByFechaRegistroDesc();
    List<Convenio> findTop100ByOrderByFechaRegistroDesc();
}
