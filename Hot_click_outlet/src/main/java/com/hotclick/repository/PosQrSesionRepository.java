package com.hotclick.repository;

import com.hotclick.model.PosQrSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PosQrSesionRepository extends JpaRepository<PosQrSesion, Long> {

    Optional<PosQrSesion> findByToken(String token);

    Optional<PosQrSesion> findByStripeSessionId(String stripeSessionId);

    Optional<PosQrSesion> findByPedidoId(Long pedidoId);

    /**
     * Reclama la sesión para cerrar la venta: devuelve 1 solo a la primera transacción
     * (webhook, consulta de estado o confirmación SINPE); las demás esperan el lock y ven 0.
     * Escribe PAGADO porque {@code chk_pos_qr_estado} no admite otro estado intermedio; si la venta
     * falla, el rollback la devuelve a PENDIENTE.
     */
    @Modifying
    @Query("UPDATE PosQrSesion s SET s.estado = 'PAGADO' WHERE s.id = :id AND s.estado = 'PENDIENTE'")
    int reclamarParaCompletar(@Param("id") Long id);

    @Modifying
    @Query("""
        UPDATE PosQrSesion s SET s.estado = 'EXPIRADO'
        WHERE s.estado = 'PENDIENTE' AND s.fechaExpiracion < :ahora
        """)
    int expirarSesionesVencidas(@Param("ahora") LocalDateTime ahora);
}
