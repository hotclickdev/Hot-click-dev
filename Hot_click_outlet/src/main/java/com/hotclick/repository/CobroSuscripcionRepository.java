package com.hotclick.repository;

import com.hotclick.model.CobroSuscripcion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CobroSuscripcionRepository extends JpaRepository<CobroSuscripcion, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CobroSuscripcion> findByOrderNumberAndEmpresaId(String orderNumber, Long empresaId);

    Optional<CobroSuscripcion> findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(
        Long empresaId, String estado, String motivo);

    /** Negocios con cobro abierto de ese estado y motivo, en una sola consulta (renovaciones). */
    @Query("SELECT DISTINCT c.empresaId FROM CobroSuscripcion c WHERE c.estado = :estado AND c.motivo = :motivo AND c.empresaId IN :empresas")
    List<Long> empresasConCobro(@Param("estado") String estado, @Param("motivo") String motivo,
                                @Param("empresas") Collection<Long> empresas);
}
