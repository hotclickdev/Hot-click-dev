package com.hotclick.repository;

import com.hotclick.model.SplitPago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SplitPagoRepository extends JpaRepository<SplitPago, Long> {

    List<SplitPago> findByPedidoIdOrderByFechaPagoAsc(Long pedidoId);
}
