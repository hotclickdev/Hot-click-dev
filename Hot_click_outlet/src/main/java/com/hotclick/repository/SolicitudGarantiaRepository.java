package com.hotclick.repository;

import com.hotclick.model.SolicitudGarantia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudGarantiaRepository extends JpaRepository<SolicitudGarantia, Long> {

    @Query("SELECT s FROM SolicitudGarantia s " +
           "LEFT JOIN FETCH s.producto pr " +
           "LEFT JOIN FETCH s.pedido p " +
           "WHERE s.usuario.id = :usuarioId AND s.estadoRegistro = 1 " +
           "ORDER BY s.fechaCreacion DESC")
    List<SolicitudGarantia> findByUsuarioIdActivas(@Param("usuarioId") Long usuarioId);

    @Query("SELECT s FROM SolicitudGarantia s " +
           "LEFT JOIN FETCH s.usuario u " +
           "LEFT JOIN FETCH s.producto pr " +
           "LEFT JOIN FETCH s.pedido p " +
           "WHERE s.estadoRegistro = 1 " +
           "ORDER BY s.fechaCreacion DESC")
    List<SolicitudGarantia> findAllActivas();

    long countByEstadoAndEstadoRegistro(String estado, Integer estadoRegistro);
}
