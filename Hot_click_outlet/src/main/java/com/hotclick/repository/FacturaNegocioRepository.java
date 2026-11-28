package com.hotclick.repository;

import com.hotclick.model.FacturaNegocio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/** Facturas que cada negocio le emite a HotClick (V262). Toda lectura del negocio va filtrada por su empresa. */
@Repository
public interface FacturaNegocioRepository extends JpaRepository<FacturaNegocio, Long> {

    /** Aislamiento: el registro de otro negocio no existe para este (el controlador responde 404). */
    Optional<FacturaNegocio> findByIdAndEmpresaId(Long id, Long empresaId);

    Optional<FacturaNegocio> findByEmpresaIdAndPeriodoDesdeAndPeriodoHasta(Long empresaId, LocalDate desde, LocalDate hasta);

    Page<FacturaNegocio> findByEmpresaIdOrderByPeriodoDesdeDesc(Long empresaId, Pageable pageable);

    boolean existsByClaveXmlAndIdNot(String claveXml, Long id);

    /** Lista del ADMIN con filtros opcionales por estado y por inicio de quincena. */
    @Query("""
        SELECT f FROM FacturaNegocio f
        WHERE (:estado IS NULL OR f.estado = :estado)
          AND (:desde IS NULL OR f.periodoDesde = :desde)
        ORDER BY f.periodoDesde DESC, f.empresaId ASC
        """)
    Page<FacturaNegocio> buscarAdmin(@Param("estado") String estado, @Param("desde") LocalDate desde, Pageable pageable);

    /** Plazo vencido sin factura aceptada: PENDIENTE o RECHAZADA pasan a VENCIDA. No cobra nada. */
    @Modifying
    @Query("""
        UPDATE FacturaNegocio f SET f.estado = 'VENCIDA', f.fechaActualizacion = :ahora
        WHERE f.estado IN ('PENDIENTE', 'RECHAZADA') AND f.fechaLimite < :hoy
        """)
    int marcarVencidas(@Param("hoy") LocalDate hoy, @Param("ahora") LocalDateTime ahora);
}
