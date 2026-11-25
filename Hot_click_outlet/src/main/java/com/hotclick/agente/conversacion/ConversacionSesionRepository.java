package com.hotclick.agente.conversacion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ConversacionSesionRepository extends JpaRepository<ConversacionSesion, UUID>,
        JpaSpecificationExecutor<ConversacionSesion> {

    Optional<ConversacionSesion> findFirstByCanalCuentaIdAndContactoExternoAndEstado(
        Long canalCuentaId, String contactoExterno, EstadoConversacion estado);

    /** AG-38: reclama el envío de la encuesta. 1 = esta llamada la reclamó; 0 = ya se había mandado. Atómico. */
    @Modifying
    @Transactional
    @Query("UPDATE ConversacionSesion s SET s.encuestaEnviadaEn = :ahora "
        + "WHERE s.id = :id AND s.encuestaEnviadaEn IS NULL")
    int reclamarEncuesta(@Param("id") UUID id, @Param("ahora") Instant ahora);

    /** AG-38: deshace la reclamación si el envío falló, para que se pueda volver a intentar. */
    @Modifying
    @Transactional
    @Query("UPDATE ConversacionSesion s SET s.encuestaEnviadaEn = NULL "
        + "WHERE s.id = :id AND s.encuestaNota IS NULL")
    int liberarEncuesta(@Param("id") UUID id);

    /** AG-38: guarda la nota solo si la encuesta se mandó y todavía no tiene respuesta (la primera respuesta gana). */
    @Modifying
    @Transactional
    @Query("UPDATE ConversacionSesion s SET s.encuestaNota = :nota, s.encuestaRespondidaEn = :ahora "
        + "WHERE s.id = :id AND s.encuestaEnviadaEn IS NOT NULL AND s.encuestaNota IS NULL")
    int guardarNotaEncuesta(@Param("id") UUID id, @Param("nota") int nota, @Param("ahora") Instant ahora);
}
