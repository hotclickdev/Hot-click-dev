package com.hotclick.repository;

import com.hotclick.model.Marca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MarcaRepository extends JpaRepository<Marca, Long> {

    List<Marca> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    boolean existsByNombreMarca(String nombreMarca);
}
