package com.hotclick.repository;

import com.hotclick.model.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RolRepository extends JpaRepository<Rol, Long> {

    Optional<Rol> findByNombreRol(String nombreRol);

    boolean existsByNombreRol(String nombreRol);
}
