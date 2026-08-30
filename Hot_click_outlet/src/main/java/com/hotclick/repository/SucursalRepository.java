package com.hotclick.repository;

import com.hotclick.model.Sucursal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SucursalRepository extends JpaRepository<Sucursal, Long> {

    @Query("SELECT s FROM Sucursal s WHERE s.empresa.id = :empresaId AND s.estado = :estado ORDER BY s.nombre ASC")
    List<Sucursal> findByEmpresaIdAndEstado(
        @Param("empresaId") Long empresaId,
        @Param("estado") Integer estado
    );

    @Query("SELECT s FROM Sucursal s WHERE s.estado = :estado ORDER BY s.nombre ASC")
    List<Sucursal> findByEstado(@Param("estado") Integer estado);
}
