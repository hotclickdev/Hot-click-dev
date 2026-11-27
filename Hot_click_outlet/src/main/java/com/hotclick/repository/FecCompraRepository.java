package com.hotclick.repository;

import com.hotclick.model.FecCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface FecCompraRepository extends JpaRepository<FecCompra, Long> {

    boolean existsByEmpresa_IdAndPeriodoDesdeAndPeriodoHasta(Long empresaId, LocalDate desde, LocalDate hasta);

    List<FecCompra> findByPeriodoDesdeAndPeriodoHastaOrderByIdAsc(LocalDate desde, LocalDate hasta);

    @Query("SELECT f FROM FecCompra f JOIN FETCH f.empresa WHERE f.estado IN :estados ORDER BY f.id ASC")
    List<FecCompra> findPorEstados(@Param("estados") Collection<String> estados);
}
