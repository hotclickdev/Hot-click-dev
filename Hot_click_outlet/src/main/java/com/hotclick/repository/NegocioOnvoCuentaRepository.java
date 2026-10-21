package com.hotclick.repository;

import com.hotclick.model.NegocioOnvoCuenta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NegocioOnvoCuentaRepository extends JpaRepository<NegocioOnvoCuenta, Long> {
    Optional<NegocioOnvoCuenta> findByEmpresaIdAndProveedorAndModo(Long empresaId, String proveedor, String modo);
}
