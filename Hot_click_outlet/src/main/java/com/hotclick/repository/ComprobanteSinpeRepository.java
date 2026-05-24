package com.hotclick.repository;

import com.hotclick.model.ComprobanteSinpe;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComprobanteSinpeRepository extends JpaRepository<ComprobanteSinpe, Long> {

    Optional<ComprobanteSinpe> findByPedidoId(Long pedidoId);

    @Query("SELECT c FROM ComprobanteSinpe c WHERE (:estado IS NULL OR c.estado = :estado) ORDER BY c.fechaSubida DESC")
    Page<ComprobanteSinpe> buscarPorEstado(@Param("estado") String estado, Pageable pageable);

    @Query("SELECT c FROM ComprobanteSinpe c WHERE c.estado = 'PENDIENTE' AND c.fechaSubida < :corte")
    List<ComprobanteSinpe> findPendientesExpirados(@Param("corte") LocalDateTime corte);
}
