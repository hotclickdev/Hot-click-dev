package com.hotclick.repository;

import com.hotclick.model.Bodega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BodegaRepository extends JpaRepository<Bodega, Long> {

    List<Bodega> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    List<Bodega> findByNombreBodegaContainingIgnoreCaseAndEstado(String nombre, Integer estado);
}
