package com.hotclick.repository;

import com.hotclick.model.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    Optional<Empresa> findBySlug(String slug);

    Optional<Empresa> findByCorreoEmpresa(String correoEmpresa);

    boolean existsBySlug(String slug);

    boolean existsByCorreoEmpresa(String correoEmpresa);

    long countByEstadoEmpresa(String estadoEmpresa);

    List<Empresa> findByEstadoEmpresaOrderByFechaRegistroDesc(String estadoEmpresa);

    List<Empresa> findAllByOrderByFechaRegistroDesc();
}
