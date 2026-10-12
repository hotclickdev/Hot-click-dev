package com.hotclick.repository;

import com.hotclick.model.CobroSuscripcion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface CobroSuscripcionRepository extends JpaRepository<CobroSuscripcion, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CobroSuscripcion> findByOrderNumberAndEmpresaId(String orderNumber, Long empresaId);

    Optional<CobroSuscripcion> findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(
        Long empresaId, String estado, String motivo);
}
