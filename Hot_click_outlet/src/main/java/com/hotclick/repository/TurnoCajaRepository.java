package com.hotclick.repository;

import com.hotclick.model.TurnoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TurnoCajaRepository extends JpaRepository<TurnoCaja, Long> {

    /** A3: bloquea el turno (SELECT ... FOR UPDATE) para serializar cierre de caja y anulaciones. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TurnoCaja t WHERE t.id = :id")
    Optional<TurnoCaja> findByIdForUpdate(@Param("id") Long id);

    /** A3: turno de una venta POS QR (solo el id, para luego bloquearlo con findByIdForUpdate). */
    @Query("SELECT s.turno.id FROM PosQrSesion s WHERE s.pedidoId = :pedidoId")
    List<Long> findTurnoIdDeSesionQr(@Param("pedidoId") Long pedidoId);


    Optional<TurnoCaja> findByUsuario_IdAndEstado(Long usuarioId, String estado);

    List<TurnoCaja> findByEmpresa_IdAndFechaAperturaAfterOrderByFechaAperturaDesc(
            Long empresaId, LocalDateTime desde);

    @Query("SELECT t FROM TurnoCaja t WHERE t.empresa.id = :empresaId ORDER BY t.fechaApertura DESC")
    List<TurnoCaja> findByEmpresaIdOrderByFechaAperturaDesc(@Param("empresaId") Long empresaId);
}
