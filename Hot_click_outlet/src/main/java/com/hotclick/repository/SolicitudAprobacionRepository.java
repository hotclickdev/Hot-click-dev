package com.hotclick.repository;

import com.hotclick.model.SolicitudAprobacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudAprobacionRepository extends JpaRepository<SolicitudAprobacion, Long> {

    List<SolicitudAprobacion> findByEstadoSolicitudOrderByFechaSolicitudDesc(String estadoSolicitud);

    List<SolicitudAprobacion> findByEmpresa_IdAndEstadoSolicitudOrderByFechaSolicitudDesc(
        Long empresaId, String estadoSolicitud
    );

    List<SolicitudAprobacion> findByEmpresa_IdOrderByFechaSolicitudDesc(Long empresaId);

    long countByEstadoSolicitud(String estadoSolicitud);

    long countByEmpresa_IdAndEstadoSolicitud(Long empresaId, String estadoSolicitud);
}
