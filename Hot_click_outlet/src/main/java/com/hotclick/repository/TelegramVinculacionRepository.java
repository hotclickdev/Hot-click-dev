package com.hotclick.repository;

import com.hotclick.model.TelegramVinculacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TelegramVinculacionRepository extends JpaRepository<TelegramVinculacion, Long> {

    Optional<TelegramVinculacion> findByUsuarioId(Long usuarioId);

    @EntityGraph(attributePaths = {"usuario"})
    Optional<TelegramVinculacion> findByCodigo(String codigo);

    @EntityGraph(attributePaths = {"usuario"})
    Optional<TelegramVinculacion> findByChatIdAndEstado(Long chatId, String estado);

    /**
     * Igual que findByChatIdAndEstado pero con row lock (SELECT ... FOR UPDATE).
     * Se usa solo al recibir fotos: un álbum de Telegram llega como varios updates
     * casi simultáneos y sin lock los appends al borrador JSON se pisarían entre sí.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM TelegramVinculacion v JOIN FETCH v.usuario WHERE v.chatId = :chatId AND v.estado = :estado")
    Optional<TelegramVinculacion> findWithLockByChatIdAndEstado(@Param("chatId") Long chatId, @Param("estado") String estado);

    List<TelegramVinculacion> findByChatIdAndEstadoAndUsuarioIdNot(Long chatId, String estado, Long usuarioId);

    /** Vinculaciones activas de todos los miembros activos de una empresa (para notificar ventas/stock). */
    @Query("""
        SELECT v FROM TelegramVinculacion v
        WHERE v.estado = 'ACTIVA' AND v.chatId IS NOT NULL AND EXISTS (
            SELECT 1 FROM MiembroEmpresa m
            WHERE m.usuario.id = v.usuario.id AND m.empresa.id = :empresaId AND m.estado = 1)
        """)
    List<TelegramVinculacion> findActivasPorEmpresa(@Param("empresaId") Long empresaId);

    /** Todas las vinculaciones activas con chat — para el chequeo semanal de inventario. */
    @EntityGraph(attributePaths = {"usuario"})
    List<TelegramVinculacion> findByEstadoAndChatIdIsNotNull(String estado);
}
