package com.hotclick.repository;

import com.hotclick.model.PaqueteInventario;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaqueteInventarioRepository extends JpaRepository<PaqueteInventario, Long> {

    Optional<PaqueteInventario> findByCodigo(String codigo);

    List<PaqueteInventario> findAllByOrderByFechaCreacionDesc(Pageable pageable);

    @Query("SELECT p FROM PaqueteInventario p LEFT JOIN FETCH p.lineas WHERE p.id = :id")
    Optional<PaqueteInventario> findByIdWithLineas(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "5000"))
    @Query("SELECT p FROM PaqueteInventario p LEFT JOIN FETCH p.lineas WHERE p.id = :id")
    Optional<PaqueteInventario> findByIdWithLineasForUpdate(@Param("id") Long id);

    List<PaqueteInventario> findByEstadoOrderByFechaCreacionDesc(String estado);
}
