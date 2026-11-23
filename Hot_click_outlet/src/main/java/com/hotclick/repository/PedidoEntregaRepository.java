package com.hotclick.repository;

import com.hotclick.model.PedidoEntrega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PedidoEntregaRepository extends JpaRepository<PedidoEntrega, Long> {
    Optional<PedidoEntrega> findByPedidoId(Long pedidoId);
}
