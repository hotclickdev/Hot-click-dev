package com.hotclick.repository;

import com.hotclick.model.PosVentaTurno;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PosVentaTurnoRepository extends JpaRepository<PosVentaTurno, Long> {
    Optional<PosVentaTurno> findByPedidoId(Long pedidoId);
}
