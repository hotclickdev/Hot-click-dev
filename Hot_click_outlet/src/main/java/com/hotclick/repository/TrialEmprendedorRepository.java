package com.hotclick.repository;

import com.hotclick.model.Empresa;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

/** Consultas del trial Emprendedor (repositorio aparte para no tocar EmpresaRepository, compartido con otros PRs). */
public interface TrialEmprendedorRepository extends Repository<Empresa, Long> {

    /** Negocios en trial Emprendedor cuyo último día ya pasó (los cierra el job diario). */
    @Query("SELECT e.id FROM Empresa e WHERE e.estadoPlan = 'TRIAL' AND e.trialEmprendedorPos IS NOT NULL "
         + "AND e.trialEmprendedorHasta < :hoy")
    List<Long> idsTrialVencidos(@Param("hoy") LocalDate hoy);
}
