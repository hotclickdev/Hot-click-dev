package com.hotclick.repository;

import com.hotclick.model.Gasto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface GastoRepository extends JpaRepository<Gasto, Long> {

    List<Gasto> findByEmpresaIdOrderByFechaDesc(Long empresaId);

    @Query("SELECT g FROM Gasto g WHERE g.empresa.id = :empresaId " +
           "AND (:desde IS NULL OR g.fecha >= :desde) " +
           "AND (:hasta IS NULL OR g.fecha <= :hasta) " +
           "ORDER BY g.fecha DESC")
    List<Gasto> findByEmpresaIdAndPeriodo(
            @Param("empresaId") Long empresaId,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta);
}
