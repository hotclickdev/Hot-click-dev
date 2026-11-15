package com.hotclick.repository;

import com.hotclick.model.Plan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByNombre(String nombre);

    /** Una página de planes activos (todos, sin filtrar por nombre); el orden lo da el {@code Pageable}. */
    Slice<Plan> findByActivoTrue(Pageable pageable);
}
