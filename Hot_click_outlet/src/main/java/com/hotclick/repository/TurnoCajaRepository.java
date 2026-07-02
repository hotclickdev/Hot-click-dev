package com.hotclick.repository;

import com.hotclick.model.TurnoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TurnoCajaRepository extends JpaRepository<TurnoCaja, Long> {

    Optional<TurnoCaja> findByUsuario_IdAndEstado(Long usuarioId, String estado);

    List<TurnoCaja> findByEmpresa_IdAndFechaAperturaAfterOrderByFechaAperturaDesc(
            Long empresaId, LocalDateTime desde);

    @Query("SELECT t FROM TurnoCaja t WHERE t.empresa.id = :empresaId ORDER BY t.fechaApertura DESC")
    List<TurnoCaja> findByEmpresaIdOrderByFechaAperturaDesc(@Param("empresaId") Long empresaId);
}
