package com.hotclick.repository;

import com.hotclick.model.ClienteEmpresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteEmpresaRepository extends JpaRepository<ClienteEmpresa, Long> {
    Optional<ClienteEmpresa> findByEmpresaIdAndUsuarioId(Long empresaId, Long usuarioId);
}
