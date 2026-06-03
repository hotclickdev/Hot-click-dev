package com.hotclick.repository;

import com.hotclick.model.Mesa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MesaRepository extends JpaRepository<Mesa, Long> {

    List<Mesa> findByEmpresaIdOrderByNombreAsc(Long empresaId);

    List<Mesa> findByEmpresaIdAndActivoTrueOrderByNombreAsc(Long empresaId);

    Optional<Mesa> findByQrToken(String qrToken);

    boolean existsByEmpresaIdAndNombre(Long empresaId, String nombre);
}
