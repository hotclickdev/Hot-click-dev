package com.hotclick.repository;

import com.hotclick.model.PedidoRetencionOnvo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PedidoRetencionOnvoRepository extends JpaRepository<PedidoRetencionOnvo, Long> {
    Optional<PedidoRetencionOnvo> findByPedidoId(Long pedidoId);

    java.util.List<PedidoRetencionOnvo> findByOnvoSessionId(String onvoSessionId);

    @Modifying
    @Transactional
    @Query("update PedidoRetencionOnvo r set r.onvoSessionId = :sesion where r.pedidoId in :ids")
    int asignarSesion(@Param("sesion") String sesion, @Param("ids") java.util.Collection<Long> ids);

    @Modifying
    @Transactional
    @Query("update PedidoRetencionOnvo r set r.estado = :estado where r.onvoSessionId = :sesion")
    int cambiarEstadoPorSesion(@Param("estado") String estado, @Param("sesion") String sesion);

    java.util.List<PedidoRetencionOnvo> findByEstadoOrderByCreadoEnAsc(String estado, org.springframework.data.domain.Pageable pageable);

    @Modifying
    @Transactional
    @Query("delete from PedidoRetencionOnvo r where r.onvoSessionId = :sesion")
    int borrarPorSesion(@Param("sesion") String sesion);

    @Modifying
    @Transactional
    @Query("delete from PedidoRetencionOnvo r where r.pedidoId = :pedidoId")
    int borrarPorPedido(@Param("pedidoId") Long pedidoId);

    @Modifying
    @Transactional
    @Query("delete from PedidoRetencionOnvo r where r.pedidoId in :ids")
    int borrarPorPedidos(@Param("ids") java.util.Collection<Long> ids);
}
