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

    /** Sesiones ligadas a un lote de pedidos (aviso de QR vencido, una sola consulta). */
    List<TelegramCompradorSesion> findByPedidoIdIn(java.util.Collection<Long> pedidoIds);

    /** Sesiones con pago pendiente (para reconciliar contra el estado del pedido). */
    List<TelegramCompradorSesion> findTop200ByPasoOrderByUltimaActividadAsc(String paso);

    /** Transición atómica ESPERANDO_PAGO → PAGADO: 1 solo ganador aunque el webhook y la reconciliación coincidan. */
    @Modifying(flushAutomatically = true)
    @Query("UPDATE TelegramCompradorSesion s SET s.paso = :hacia, s.ultimaActividad = :ahora "
         + "WHERE s.id = :id AND s.paso = :desde")
    int cambiarPaso(@Param("id") Long id, @Param("desde") String desde, @Param("hacia") String hacia,
                    @Param("ahora") LocalDateTime ahora);

    /** Pedido vencido sin pagar: la sesión vuelve al catálogo sin pedido ni contexto (solo si seguía esperando pago). */
    @Modifying(flushAutomatically = true)
    @Query("UPDATE TelegramCompradorSesion s SET s.paso = :hacia, s.pedidoId = NULL, s.contexto = NULL, "
         + "s.ultimaActividad = :ahora WHERE s.id = :id AND s.paso = :desde")
    int cerrarVencida(@Param("id") Long id, @Param("desde") String desde, @Param("hacia") String hacia,
                      @Param("ahora") LocalDateTime ahora);

    /** Sesiones sin actividad desde {@code corte} y sin pedido en curso (carrito abandonado): se borran. */
    @Modifying
    @Query("DELETE FROM TelegramCompradorSesion s WHERE s.ultimaActividad < :corte AND s.pedidoId IS NULL")
    int borrarInactivas(@Param("corte") LocalDateTime corte);
}
