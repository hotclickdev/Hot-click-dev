package com.hotclick.repository;

import com.hotclick.model.Bodega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BodegaRepository extends JpaRepository<Bodega, Long> {

    List<Bodega> findByEstado(Integer estado);

    List<Bodega> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    List<Bodega> findByNombreBodegaContainingIgnoreCaseAndEstado(String nombre, Integer estado);

    @Query("SELECT b FROM Bodega b WHERE b.empresa.id = :empresaId AND b.estado = :estado")
    List<Bodega> findByEmpresaIdAndEstado(@Param("empresaId") Long empresaId, @Param("estado") Integer estado);
}
