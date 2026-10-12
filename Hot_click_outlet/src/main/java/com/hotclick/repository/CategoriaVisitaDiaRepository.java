package com.hotclick.repository;

import com.hotclick.model.CategoriaVisitaDia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CategoriaVisitaDiaRepository extends JpaRepository<CategoriaVisitaDia, Long> {

    @Modifying
    @Query("UPDATE CategoriaVisitaDia v SET v.visitas = v.visitas + 1 WHERE v.categoriaId = :categoriaId AND v.dia = :dia")
    int incrementar(@Param("categoriaId") Long categoriaId, @Param("dia") LocalDate dia);

    /** Filas [categoriaId, suma de visitas] desde {@code desde} (inclusive). */
    @Query("SELECT v.categoriaId, SUM(v.visitas) FROM CategoriaVisitaDia v WHERE v.dia >= :desde GROUP BY v.categoriaId")
    List<Object[]> sumarDesde(@Param("desde") LocalDate desde);
}
