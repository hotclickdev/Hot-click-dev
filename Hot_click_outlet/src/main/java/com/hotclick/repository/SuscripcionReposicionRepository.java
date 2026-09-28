package com.hotclick.repository;

import com.hotclick.model.SuscripcionReposicion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SuscripcionReposicionRepository extends JpaRepository<SuscripcionReposicion, Long> {

    boolean existsByProducto_IdAndCorreoIgnoreCase(Long productoId, String correo);

    Optional<SuscripcionReposicion> findByProducto_IdAndCorreoIgnoreCase(Long productoId, String correo);
}
