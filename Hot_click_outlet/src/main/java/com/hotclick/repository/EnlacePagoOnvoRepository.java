package com.hotclick.repository;

import com.hotclick.model.EnlacePagoOnvo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnlacePagoOnvoRepository extends JpaRepository<EnlacePagoOnvo, Long> {
    Optional<EnlacePagoOnvo> findByOnvoSessionId(String onvoSessionId);
    List<EnlacePagoOnvo> findByEmpresaIdOrderByCreadoEnDesc(Long empresaId, Pageable pageable);
    List<EnlacePagoOnvo> findByEmpresaIdAndEstado(Long empresaId, String estado);
    List<EnlacePagoOnvo> findByEstadoOrderByCreadoEnAsc(String estado, Pageable pageable);
}
