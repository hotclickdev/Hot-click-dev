package com.hotclick.repository;

import com.hotclick.model.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    List<Proveedor> findByEmpresa_IdAndEstadoOrderByNombreAsc(Long empresaId, Integer estado);

    List<Proveedor> findByEstadoOrderByNombreAsc(Integer estado);
}
