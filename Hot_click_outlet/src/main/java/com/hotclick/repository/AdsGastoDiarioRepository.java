package com.hotclick.repository;

import com.hotclick.model.AdsGastoDiario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AdsGastoDiarioRepository extends JpaRepository<AdsGastoDiario, Long> {

    @Query("""
        SELECT g FROM AdsGastoDiario g
        WHERE g.fecha >= :desde AND g.fecha <= :hasta
          AND (:empresaId IS NULL OR g.empresa.id = :empresaId OR (g.empresa IS NULL AND :empresaId IS NULL))
        ORDER BY g.fecha DESC
        """)
    List<AdsGastoDiario> findEnPeriodo(
        @Param("empresaId") Long empresaId,
        @Param("desde") LocalDate desde,
        @Param("hasta") LocalDate hasta);

    @Query("""
        SELECT g FROM AdsGastoDiario g
        WHERE g.fecha >= :desde AND g.fecha <= :hasta
          AND (:empresaId IS NULL OR g.empresa.id = :empresaId)
        """)
    List<AdsGastoDiario> findParaMetricas(
        @Param("empresaId") Long empresaId,
        @Param("desde") LocalDate desde,
        @Param("hasta") LocalDate hasta);

    Optional<AdsGastoDiario> findByEmpresa_IdAndFechaAndCanalAndCampana(
        Long empresaId, LocalDate fecha, String canal, String campana);

    @Query("""
        SELECT g FROM AdsGastoDiario g
        WHERE g.fecha = :fecha AND g.canal = :canal AND g.campana = :campana
          AND g.empresa IS NULL
        """)
    Optional<AdsGastoDiario> findPlataformaByFechaAndCanalAndCampana(
        @Param("fecha") LocalDate fecha,
        @Param("canal") String canal,
        @Param("campana") String campana);
}
