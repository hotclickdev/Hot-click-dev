package com.hotclick.agente.conversacion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ConversacionMensajeRepository extends JpaRepository<ConversacionMensaje, Long> {

    /** Los últimos 20 turnos, del más reciente al más antiguo. */
    List<ConversacionMensaje> findTop20BySesionIdOrderByIdDesc(UUID sesionId);

    /** Los últimos 200 turnos de una conversación, del más reciente al más antiguo (vista de la bandeja). */
    List<ConversacionMensaje> findTop200BySesionIdOrderByIdDesc(UUID sesionId);

    /** El último turno de cada conversación indicada, en una sola consulta (vista previa de la lista). */
    @Query("""
        SELECT m FROM ConversacionMensaje m WHERE m.id IN (
            SELECT MAX(m2.id) FROM ConversacionMensaje m2 WHERE m2.sesionId IN :ids GROUP BY m2.sesionId)
        """)
    List<ConversacionMensaje> ultimosDe(@Param("ids") Collection<UUID> ids);
}
