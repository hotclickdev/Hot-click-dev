package com.hotclick.repository;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
public interface CodigoOtpRepository extends JpaRepository<CodigoOtp, Long> {

    Optional<CodigoOtp> findTopByUsuarioAndTipoOtpNombreAndActiveFlagTrueOrderByIdOtpCodeDesc(
            Usuario usuario, String tipoNombre);

    @Query("SELECT COUNT(o) FROM CodigoOtp o " +
           "WHERE o.usuario = :usuario AND o.tipoOtp.nombre = :tipo AND o.expiresAt > :desde")
    long countRecentOtps(@Param("usuario") Usuario usuario,
                         @Param("tipo") String tipo,
                         @Param("desde") LocalDateTime desde);

    @Modifying
    @Transactional
    @Query("UPDATE CodigoOtp o SET o.activeFlag = false " +
           "WHERE o.usuario = :usuario AND o.tipoOtp.nombre = :tipo AND o.activeFlag = true")
    void invalidarOtpsAnteriores(@Param("usuario") Usuario usuario, @Param("tipo") String tipo);

    @Modifying
    @Transactional
    @Query("UPDATE CodigoOtp o SET o.attempts = o.attempts + 1 WHERE o.idOtpCode = :id")
    void incrementarAttempts(@Param("id") Long id);

    @Modifying
    @Transactional
    @Query("UPDATE CodigoOtp o SET o.activeFlag = false WHERE o.idOtpCode = :id")
    void invalidar(@Param("id") Long id);

    /**
     * OTPs ya verificados (paso 2) que todavía no se canjearon para cambiar la contraseña
     * (estado sigue en {@code estadoVigente}), del más nuevo al más viejo.
     */
    @Query("SELECT o FROM CodigoOtp o " +
           "WHERE o.usuario = :usuario AND o.tipoOtp.nombre = :tipo " +
           "AND o.usedAt IS NOT NULL AND o.activeFlag = false " +
           "AND o.estado = :estadoVigente AND o.usedAt > :desde " +
           "ORDER BY o.idOtpCode DESC")
    List<CodigoOtp> findVerificadosSinCanjear(@Param("usuario") Usuario usuario,
                                              @Param("tipo") String tipo,
                                              @Param("estadoVigente") Integer estadoVigente,
                                              @Param("desde") LocalDateTime desde);

    /** Canje atómico de un solo uso: devuelve 0 si otra petición ya lo canjeó. */
    @Modifying
    @Transactional
    @Query("UPDATE CodigoOtp o SET o.estado = :estadoCanjeado " +
           "WHERE o.idOtpCode = :id AND o.estado = :estadoVigente")
    int canjear(@Param("id") Long id,
                @Param("estadoVigente") Integer estadoVigente,
                @Param("estadoCanjeado") Integer estadoCanjeado);

    /** Da de baja cualquier otro OTP verificado y sin canjear del usuario (no se pueden reutilizar). */
    @Modifying
    @Transactional
    @Query("UPDATE CodigoOtp o SET o.estado = :estadoCanjeado " +
           "WHERE o.usuario = :usuario AND o.tipoOtp.nombre = :tipo " +
           "AND o.usedAt IS NOT NULL AND o.estado = :estadoVigente")
    int darDeBajaVerificados(@Param("usuario") Usuario usuario,
                             @Param("tipo") String tipo,
                             @Param("estadoVigente") Integer estadoVigente,
                             @Param("estadoCanjeado") Integer estadoCanjeado);
}
