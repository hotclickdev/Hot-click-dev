package com.hotclick.repository;

import com.hotclick.model.EmpresaCuentaOnvo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmpresaCuentaOnvoRepository extends JpaRepository<EmpresaCuentaOnvo, Long> {
    Optional<EmpresaCuentaOnvo> findByEmpresaId(Long empresaId);
    List<EmpresaCuentaOnvo> findByEstadoInOrderByActualizadoEnAsc(Collection<String> estados, Pageable pageable);
}
