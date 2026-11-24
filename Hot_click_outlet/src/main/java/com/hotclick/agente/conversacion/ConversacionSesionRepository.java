package com.hotclick.agente.conversacion;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ConversacionSesionRepository extends JpaRepository<ConversacionSesion, UUID> {

    Optional<ConversacionSesion> findFirstByCanalCuentaIdAndContactoExternoAndEstado(
        Long canalCuentaId, String contactoExterno, EstadoConversacion estado);
}
