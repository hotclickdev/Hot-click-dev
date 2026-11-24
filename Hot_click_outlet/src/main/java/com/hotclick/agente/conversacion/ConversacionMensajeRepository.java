package com.hotclick.agente.conversacion;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConversacionMensajeRepository extends JpaRepository<ConversacionMensaje, Long> {

    /** Los últimos 20 turnos, del más reciente al más antiguo. */
    List<ConversacionMensaje> findTop20BySesionIdOrderByIdDesc(UUID sesionId);
}
