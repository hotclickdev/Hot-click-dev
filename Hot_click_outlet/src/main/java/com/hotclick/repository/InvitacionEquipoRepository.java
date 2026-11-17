package com.hotclick.repository;

import com.hotclick.model.InvitacionEquipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface InvitacionEquipoRepository extends JpaRepository<InvitacionEquipo, Long> {

    Optional<InvitacionEquipo> findByTokenHash(String tokenHash);

    /** Invitaciones vivas (sin usar, sin revocar, no vencidas) del negocio, sin contar la de {@code correo}. */
    @Query("""
        SELECT COUNT(i) FROM InvitacionEquipo i WHERE i.empresa.id = :empresaId AND i.correo <> :correo
          AND i.usadoEn IS NULL AND i.revocadoEn IS NULL AND i.venceEn > :ahora
        """)
    long contarPendientesExcluyendoCorreo(@Param("empresaId") Long empresaId, @Param("correo") String correo,
                                          @Param("ahora") LocalDateTime ahora);

    /** Invalida la invitación viva anterior del mismo correo y negocio (un solo uso vigente). */
    @Modifying(flushAutomatically = true)
    @Query(value = """
        UPDATE hot_click_invitacion_equipo_tb SET revocado_en = :ahora
        WHERE fk_id_empresa = :empresaId AND correo = :correo AND usado_en IS NULL AND revocado_en IS NULL
        """, nativeQuery = true)
    int revocarPendientes(@Param("empresaId") Long empresaId, @Param("correo") String correo,
                          @Param("ahora") LocalDateTime ahora);

    /** Consume el token de forma atómica: 1 si esta llamada lo usó, 0 si ya estaba usado, revocado o vencido. */
    @Modifying(flushAutomatically = true)
    @Query(value = """
        UPDATE hot_click_invitacion_equipo_tb SET usado_en = :ahora
        WHERE id_invitacion = :id AND usado_en IS NULL AND revocado_en IS NULL AND vence_en > :ahora
        """, nativeQuery = true)
    int consumir(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);
}
