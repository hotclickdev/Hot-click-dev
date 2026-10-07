package com.hotclick.repository;

import com.hotclick.model.SancionPlataforma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SancionPlataformaRepository extends JpaRepository<SancionPlataforma, Long> {

    long countByEmpresaIdAndNivelSolicitado(Long empresaId, String nivelSolicitado);

    boolean existsByEmpresaIdAndActivaTrue(Long empresaId);

    Optional<SancionPlataforma> findFirstByEmpresaIdAndActivaTrueOrderByCreadaDesc(Long empresaId);

    List<SancionPlataforma> findByEmpresaIdOrderByCreadaDesc(Long empresaId);

    List<SancionPlataforma> findByActivaTrue();
}
