package com.hotclick.agente.conversacion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ConversacionSesionRepository extends JpaRepository<ConversacionSesion, UUID>,
        JpaSpecificationExecutor<ConversacionSesion> {

    Optional<ConversacionSesion> findFirstByCanalCuentaIdAndContactoExternoAndEstado(
        Long canalCuentaId, String contactoExterno, EstadoConversacion estado);

    /** Ventana de 24 h de un contacto: ¿alguna conversación suya del canal tuvo un mensaje del cliente desde {@code desde}? */
    boolean existsByCanalAndContactoExternoAndUltimoMensajeClienteAfter(
        String canal, String contactoExterno, Instant desde);
}
