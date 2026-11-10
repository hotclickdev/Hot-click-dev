package com.hotclick.repository;

import com.hotclick.model.Plan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByNombre(String nombre);

    List<Plan> findByActivoTrueOrderByPrecioMensualAsc();

    /** Planes activos de un catálogo de nombres, acotado por {@code pageable} (nombre es UNIQUE: cota = tamaño del catálogo). */
    List<Plan> findByNombreInAndActivoTrueOrderByPrecioMensualAsc(Collection<String> nombres, Pageable pageable);
}
