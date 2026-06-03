package com.hotclick.repository;

import com.hotclick.model.Forecast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ForecastRepository extends JpaRepository<Forecast, Long> {

    List<Forecast> findByEmpresaIdAndProductoIdIsNullAndTipoOrderByPeriodoAsc(Long empresaId, String tipo);

    List<Forecast> findByEmpresaIdAndProductoIdAndTipoOrderByPeriodoAsc(Long empresaId, Long productoId, String tipo);

    @Modifying
    @Query("DELETE FROM Forecast f WHERE f.empresa.id = :empresaId AND f.productoId IS NULL")
    void deleteEmpresaLevelForecasts(@Param("empresaId") Long empresaId);

    @Modifying
    @Query("DELETE FROM Forecast f WHERE f.empresa.id = :empresaId")
    void deleteAllByEmpresaId(@Param("empresaId") Long empresaId);
}
