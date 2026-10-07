package com.hotclick.repository;

import com.hotclick.model.NotaOperador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotaOperadorRepository extends JpaRepository<NotaOperador, Long> {

    List<NotaOperador> findTop20ByOrderByCreadaDesc();

    List<NotaOperador> findByEmpresaIdOrderByCreadaDesc(Long empresaId);
}
