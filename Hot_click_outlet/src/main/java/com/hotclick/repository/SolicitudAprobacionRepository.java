package com.hotclick.repository;

import com.hotclick.model.SolicitudAprobacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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

    /** Cierra las solicitudes de producto pendientes al aprobar la empresa (la aprobación del negocio las publica en bloque). */
    @Modifying
    @Query("UPDATE SolicitudAprobacion s SET s.estadoSolicitud = 'APROBADO', s.fechaResolucion = :ahora " +
           "WHERE s.empresa.id = :empresaId AND s.tipoEntidad = 'PRODUCTO' AND s.estadoSolicitud = 'PENDIENTE'")
    int aprobarPendientesProductoDeEmpresa(@Param("empresaId") Long empresaId, @Param("ahora") LocalDateTime ahora);
}
