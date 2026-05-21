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
import java.time.LocalDateTime;
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

    @Query("SELECT COUNT(o) FROM CodigoOtp o " +
           "WHERE o.usuario = :usuario AND o.tipoOtp.nombre = :tipo " +
           "AND o.usedAt IS NOT NULL AND o.activeFlag = false AND o.usedAt > :desde")
    long countRecentlyConsumedOtps(@Param("usuario") Usuario usuario,
                                    @Param("tipo") String tipo,
                                    @Param("desde") LocalDateTime desde);
}
