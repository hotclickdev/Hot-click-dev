package com.hotclick.agente.conversacion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface ConversacionSesionRepository extends JpaRepository<ConversacionSesion, UUID>,
        JpaSpecificationExecutor<ConversacionSesion> {

    Optional<ConversacionSesion> findFirstByCanalCuentaIdAndContactoExternoAndEstado(
        Long canalCuentaId, String contactoExterno, EstadoConversacion estado);
}
