package com.hotclick.agente.interno;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgenteAccionRepository extends JpaRepository<AgenteAccion, Long> {

    List<AgenteAccion> findTop50ByEmpresaIdOrderByIdDesc(Long empresaId);
}
