package com.hotclick.repository;

import com.hotclick.model.InvitacionPropietario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface InvitacionPropietarioRepository extends JpaRepository<InvitacionPropietario, Long> {

    Optional<InvitacionPropietario> findByTokenHash(String tokenHash);

    Optional<InvitacionPropietario> findFirstByEmpresa_IdOrderByIdDesc(Long empresaId);

    /**
     * Un solo uso, sin carrera: solo una transacción actualiza la fila vigente.
     * @return 1 si esta llamada ganó el enlace, 0 si ya estaba usado, revocado o vencido
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE InvitacionPropietario i
           SET i.usadaEn = :ahora, i.usadaPorId = :usuarioId
         WHERE i.id = :id
           AND i.usadaEn IS NULL
           AND i.revocadaEn IS NULL
           AND i.expiraEn > :ahora
        """)
    int reclamarSiActiva(@Param("id") Long id,
                         @Param("ahora") LocalDateTime ahora,
                         @Param("usuarioId") Long usuarioId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE InvitacionPropietario i
           SET i.revocadaEn = :ahora
         WHERE i.empresa.id = :empresaId
           AND i.usadaEn IS NULL
           AND i.revocadaEn IS NULL
        """)
    int revocarActivas(@Param("empresaId") Long empresaId, @Param("ahora") LocalDateTime ahora);
}
