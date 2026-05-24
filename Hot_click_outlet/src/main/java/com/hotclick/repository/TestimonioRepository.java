package com.hotclick.repository;

import com.hotclick.model.Testimonio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TestimonioRepository extends JpaRepository<Testimonio, Long> {
    List<Testimonio> findByEstadoOrderByFechaAprobacionDesc(String estado);
    List<Testimonio> findAllByOrderByFechaCreacionDesc();
}
