package com.hotclick.repository;

import com.hotclick.model.TelegramVinculacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
          AND NOT EXISTS (
            SELECT 1 FROM TelegramBloqueoEmpresa b
            WHERE b.usuarioId = v.usuario.id AND b.empresaId = :empresaId)
        """)
    List<TelegramVinculacion> findActivasPorEmpresa(@Param("empresaId") Long empresaId);

    /** Todas las vinculaciones activas con chat — para el chequeo semanal de inventario. */
    @EntityGraph(attributePaths = {"usuario"})
    @Query("""
        SELECT v FROM TelegramVinculacion v
        WHERE v.estado = :estado AND v.chatId IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM TelegramBloqueoEmpresa b
            WHERE b.usuarioId = v.usuario.id AND b.empresaId = v.empresaActivaId)
        """)
    List<TelegramVinculacion> findByEstadoAndChatIdIsNotNull(@Param("estado") String estado);

    /**
     * Canje atómico del código: una sola sentencia que exige código vigente y vínculo no REVOCADA. Devuelve 1 si
     * ganó; 0 si el código ya se usó, venció o la vinculación se revocó (no se escribe nada). Orden de los
     * parámetros nativos: chat, username, ahora (fecha_vinculacion), id, codigo, ahora (vencimiento).
     */
    @Transactional
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        UPDATE hot_click_telegram_vinculacion_tb
           SET chat_id = :chatId, telegram_username = :username, estado = 'ACTIVA',
               fecha_vinculacion = :ahora, codigo = NULL, codigo_expira = NULL, contexto = NULL,
               version = version + 1
         WHERE id_vinculacion = :id AND codigo = :codigo
           AND codigo_expira > :ahora AND estado <> 'REVOCADA'
        """, nativeQuery = true)
    int canjearCodigo(@Param("id") Long id, @Param("codigo") String codigo, @Param("chatId") Long chatId,
                      @Param("username") String username, @Param("ahora") LocalDateTime ahora);

    /**
     * Revocación atómica (no depende de la versión leída): deja REVOCADA y borra chat, contexto, código y
     * vencimiento. Si un canje tiene la fila, espera a que commitee y revoca encima.
     */
    @Transactional
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        UPDATE hot_click_telegram_vinculacion_tb
           SET estado = 'REVOCADA', chat_id = NULL, contexto = NULL, codigo = NULL, codigo_expira = NULL,
               version = version + 1
         WHERE id_vinculacion = :id
        """, nativeQuery = true)
    int revocarPorId(@Param("id") Long id);

    /** Limpia empresa activa y contexto sin reescribir el resto de la fila (no puede reactivar una REVOCADA). */
    @Transactional
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        UPDATE hot_click_telegram_vinculacion_tb
           SET fk_id_empresa_activa = NULL, contexto = NULL, version = version + 1
         WHERE id_vinculacion = :id AND fk_id_empresa_activa = :empresaId
        """, nativeQuery = true)
    int limpiarEmpresaActiva(@Param("id") Long id, @Param("empresaId") Long empresaId);
}
