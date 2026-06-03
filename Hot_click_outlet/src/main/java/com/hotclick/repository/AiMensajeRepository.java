package com.hotclick.repository;

import com.hotclick.model.AiMensaje;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiMensajeRepository extends JpaRepository<AiMensaje, Long> {

    List<AiMensaje> findByEmpresaIdOrderByFechaCreacionAsc(Long empresaId, Pageable pageable);

    void deleteByEmpresaId(Long empresaId);
}
