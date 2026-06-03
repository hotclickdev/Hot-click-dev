package com.hotclick.repository;

import com.hotclick.model.Reporte;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReporteRepository extends JpaRepository<Reporte, Long> {

    Optional<Reporte> findByEmpresaIdAndTipoAndPeriodo(Long empresaId, String tipo, String periodo);

    List<Reporte> findByEmpresaIdAndTipoOrderByPeriodoDesc(Long empresaId, String tipo);
}
