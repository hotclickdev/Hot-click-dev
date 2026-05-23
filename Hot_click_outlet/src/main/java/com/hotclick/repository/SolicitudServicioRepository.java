package com.hotclick.repository;

import com.hotclick.model.SolicitudServicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SolicitudServicioRepository extends JpaRepository<SolicitudServicio, Long> {
    List<SolicitudServicio> findByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId);
    List<SolicitudServicio> findAllByOrderByFechaCreacionDesc();
    List<SolicitudServicio> findByEstadoOrderByFechaCreacionDesc(String estado);
}
