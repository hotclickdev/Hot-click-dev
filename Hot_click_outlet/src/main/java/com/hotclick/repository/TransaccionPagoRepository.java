package com.hotclick.repository;

import com.hotclick.model.TransaccionPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransaccionPagoRepository extends JpaRepository<TransaccionPago, Long> {

    Optional<TransaccionPago> findTopByPagoIdOrderByFechaTransaccionDesc(Long pagoId);
}
