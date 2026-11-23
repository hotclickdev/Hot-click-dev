package com.hotclick.repository;

import com.hotclick.model.TelegramCompradorSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TelegramCompradorSesionRepository extends JpaRepository<TelegramCompradorSesion, Long> {

    Optional<TelegramCompradorSesion> findByChatId(Long chatId);

    Optional<TelegramCompradorSesion> findFirstByPedidoId(Long pedidoId);

    /** Sesiones con pago pendiente (para reconciliar contra el estado del pedido). */
    List<TelegramCompradorSesion> findTop200ByPasoOrderByUltimaActividadAsc(String paso);

    /** Sesiones sin actividad desde {@code corte} y sin pedido en curso (carrito abandonado): se borran. */
    @Modifying
    @Query("DELETE FROM TelegramCompradorSesion s WHERE s.ultimaActividad < :corte AND s.pedidoId IS NULL")
    int borrarInactivas(@Param("corte") LocalDateTime corte);
}
