package com.hotclick.repository;

import com.hotclick.model.Cotizacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CotizacionRepository extends JpaRepository<Cotizacion, Long> {
    List<Cotizacion> findByEstadoOrderByFechaCotizacionDesc(Integer estado);
}
