package com.hotclick.repository;

import com.hotclick.model.AdsInsightDiario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AdsInsightDiarioRepository extends JpaRepository<AdsInsightDiario, Long> {

    @Query("""
        SELECT i FROM AdsInsightDiario i
        WHERE i.fecha >= :desde AND i.fecha <= :hasta
          AND (:empresaId IS NULL OR i.empresa.id = :empresaId)
        ORDER BY i.fecha DESC
        """)
    List<AdsInsightDiario> findEnPeriodo(
        @Param("empresaId") Long empresaId,
        @Param("desde") LocalDate desde,
        @Param("hasta") LocalDate hasta);

    Optional<AdsInsightDiario> findByEmpresa_IdAndFechaAndCanalAndCampanaAndAnuncioId(
        Long empresaId, LocalDate fecha, String canal, String campana, String anuncioId);

    @Query("""
        SELECT i FROM AdsInsightDiario i
        WHERE i.fecha = :fecha AND i.canal = :canal AND i.campana = :campana
          AND i.anuncioId = :anuncioId AND i.empresa IS NULL
        """)
    Optional<AdsInsightDiario> findPlataforma(
        @Param("fecha") LocalDate fecha,
        @Param("canal") String canal,
        @Param("campana") String campana,
        @Param("anuncioId") String anuncioId);
}
