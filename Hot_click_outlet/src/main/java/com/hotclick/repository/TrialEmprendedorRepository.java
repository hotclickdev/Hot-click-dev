package com.hotclick.repository;

import com.hotclick.model.Empresa;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

/** Consultas del trial Emprendedor (repositorio aparte para no tocar EmpresaRepository, compartido con otros PRs). */
public interface TrialEmprendedorRepository extends Repository<Empresa, Long> {

    /**
     * Negocios con trial Emprendedor cuyo último día ya pasó y que el job diario tiene que llevar al flujo de impago:
     * los que siguen en TRIAL y los que el webhook dejó en PAST_DUE pero sin una suscripción PAST_DUE con fecha_fin
     * (el job de impago filtra por fecha_fin y nunca los elegiría).
     */
    @Query("SELECT e.id FROM Empresa e WHERE e.trialEmprendedorPos IS NOT NULL AND e.trialEmprendedorHasta < :hoy "
         + "AND (e.estadoPlan = 'TRIAL' OR (e.estadoPlan = 'PAST_DUE' AND NOT EXISTS ("
         + "SELECT 1 FROM Suscripcion s WHERE s.empresa = e AND s.estado = 'PAST_DUE' AND s.fechaFin IS NOT NULL)))")
    List<Long> idsTrialVencidos(@Param("hoy") LocalDate hoy);
}
